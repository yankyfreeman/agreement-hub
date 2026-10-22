import { connection } from "next/server";
import { documentMarkdown, loadDocument, snapshotName } from "@/lib/data";
import { documentRecord } from "@/lib/record";

// Downloads the current document, or its conversation record, as Markdown for
// the developer's project. Developer link only.
export async function GET(_: Request, ctx: RouteContext<"/manage/[token]/export/[kind]">) {
  await connection();
  const { token, kind } = await ctx.params;
  if (kind !== "document" && kind !== "record") return new Response("Not found", { status: 404 });
  const view = await loadDocument(token);
  if (!view || view.role !== "developer") return new Response("Not found", { status: 404 });

  // Same names the skill uses in the project's agreement-hub/ folder.
  const savedAt = new Date();
  const [name, body] =
    kind === "document"
      ? [snapshotName(view.document, "scope", savedAt), documentMarkdown(view, savedAt)]
      : [snapshotName(view.document, "record", savedAt), documentRecord(view, { savedAt })];
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
