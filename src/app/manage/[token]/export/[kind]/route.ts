import { connection } from "next/server";
import { documentMarkdown, loadDocument, PROJECT_FILE } from "@/lib/data";
import { documentRecord } from "@/lib/record";

// Downloads the current document, or its conversation record, as Markdown for
// the developer's project. Developer link only.
export async function GET(_: Request, ctx: RouteContext<"/manage/[token]/export/[kind]">) {
  await connection();
  const { token, kind } = await ctx.params;
  if (kind !== "document" && kind !== "record") return new Response("Not found", { status: 404 });
  const view = await loadDocument(token);
  if (!view || view.role !== "developer") return new Response("Not found", { status: 404 });

  // Named like the project's files (docs/scope/scope.md and record.md), so the
  // download replaces the old file as it is.
  const savedAt = new Date();
  const [path, body] =
    kind === "document"
      ? [PROJECT_FILE.scope, documentMarkdown(view, savedAt)]
      : [PROJECT_FILE.record, documentRecord(view, { savedAt })];
  const name = path.split("/").pop();
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
