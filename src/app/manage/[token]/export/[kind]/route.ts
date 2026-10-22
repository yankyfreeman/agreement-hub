import { connection } from "next/server";
import { documentMarkdown, loadDocument } from "@/lib/data";
import { slug } from "@/lib/markdown-import";
import { documentRecord } from "@/lib/record";

// Downloads the current document, or its conversation record, as Markdown for
// the developer's project. Developer link only.
export async function GET(_: Request, ctx: RouteContext<"/manage/[token]/export/[kind]">) {
  await connection();
  const { token, kind } = await ctx.params;
  if (kind !== "document" && kind !== "record") return new Response("Not found", { status: 404 });
  const view = await loadDocument(token);
  if (!view || view.role !== "developer") return new Response("Not found", { status: 404 });

  const base = slug(view.document.title) || "scope";
  const [name, body] =
    kind === "document"
      ? [`${base}.md`, documentMarkdown(view)]
      : [`${base}-record.md`, documentRecord(view)];
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
