import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Role } from "@/db";
import { loadDocument } from "@/lib/data";
import { DocumentView } from "./document-view";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  role: Role;
};

// Shared by the developer (/manage/…) and client (/d/…) routes. The token in
// the URL decides the role, and each route only accepts its own kind of token.
export function DocumentPage(props: Props) {
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-3xl px-4 py-8 text-sm text-zinc-500">Loading…</p>}
    >
      <Loaded {...props} />
    </Suspense>
  );
}

async function Loaded({ params, searchParams, role }: Props) {
  // Always read fresh data at request time; never prerender a document.
  await connection();
  const [{ token }, { view: tab }] = await Promise.all([params, searchParams]);
  const view = await loadDocument(token);
  if (!view || view.role !== role) notFound();
  return <DocumentView view={view} token={token} tab={tab === "progress" ? "progress" : "scope"} />;
}
