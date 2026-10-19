import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

// With DATABASE_URL set (Vercel + Neon) we talk to Postgres over HTTP.
// Without it we fall back to PGlite, an embedded Postgres stored in .data/,
// so local development needs no database account.
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon(neon(url), { schema });
  }
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon database from the Vercel Marketplace.",
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(".data", { recursive: true });
  const client = new PGlite(".data/pglite");
  // Same Postgres dialect, so the query API is identical for our purposes.
  return drizzlePglite(client, { schema }) as unknown as Db;
}

async function init(): Promise<Db> {
  const db = await connect();
  for (const statement of schema.SCHEMA_SQL) {
    await db.execute(sql.raw(statement));
  }
  return db;
}

// Cached on globalThis so dev hot reloads reuse one connection (PGlite only
// allows a single open instance per data directory).
const globalForDb = globalThis as unknown as { dbPromise?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.dbPromise ??= init().catch((err) => {
    globalForDb.dbPromise = undefined;
    throw err;
  });
  return globalForDb.dbPromise;
}

export * from "./schema";
