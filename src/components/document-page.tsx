import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Role } from "@/db";
import { loadDocument } from "@/lib/data";
import { DocumentView } from "./document-view";

// Shared by the developer (/manage/…) and client (/d/…) routes. The token in
// the URL decides the role, and each route only accepts its own kind of token.
export function DocumentPage({ params, role }: { params: Promise<{ token: string }>; role: Role }) {
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-3xl px-4 py-8 text-sm text-zinc-500">Loading…</p>}
    >
      <Loaded params={params} role={role} />
    </Suspense>
  );
}

async function Loaded({ params, role }: { params: Promise<{ token: string }>; role: Role }) {
  // Always read fresh data at request time; never prerender a document.
  await connection();
  const { token } = await params;
  const view = await loadDocument(token);
  if (!view || view.role !== role) notFound();
  return <DocumentView view={view} token={token} />;
}
