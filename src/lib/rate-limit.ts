// Fixed-window rate limits stored in the database, so they hold across
// serverless instances without an extra service.

import { createHash } from "node:crypto";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb, rateEvents } from "@/db";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

// Callers are identified by IP address, but everyone using the Claude app
// reaches the MCP server from Anthropic's shared addresses, so the per-caller
// limits are generous ceilings; the per-document and total limits do the
// finer work.
export const LIMITS = {
  /** Any MCP request, per caller. */
  mcp: { limit: 600, seconds: MINUTE },
  /** MCP tool calls on one document (keyed by its developer link). */
  document: { limit: 60, seconds: MINUTE },
  /** New documents per caller, from the website or MCP. */
  create: { limit: 60, seconds: HOUR },
  /** New documents from everyone together, so many callers can't flood it either. */
  createTotal: { limit: 300, seconds: HOUR },
};

type Limit = (typeof LIMITS)[keyof typeof LIMITS];

/** A short hash, so IP addresses and links are never stored as they are. */
export function hashId(value: string) {
  return createHash("sha256").update(value).digest("base64url").slice(0, 16);
}

export function callerId(headers: Headers) {
  return hashId(
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local",
  );
}

/** Records one call in the bucket, or returns false if the limit is already reached. */
export async function take(bucket: string, { limit, seconds }: Limit) {
  const db = await getDb();
  const since = new Date(Date.now() - seconds * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(rateEvents)
    .where(and(eq(rateEvents.bucket, bucket), gt(rateEvents.createdAt, since)));
  if (n >= limit) return false;
  await db.insert(rateEvents).values({ bucket });
  if (Math.random() < 0.01) {
    await db.delete(rateEvents).where(lt(rateEvents.createdAt, new Date(Date.now() - 24 * HOUR * 1000)));
  }
  return true;
}

/** Whether this caller may create another document right now. */
export async function takeCreate(caller: string) {
  return (await take(`create:${caller}`, LIMITS.create)) && (await take("create", LIMITS.createTotal));
}
