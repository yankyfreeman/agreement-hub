import { connection } from "next/server";
import { findDocumentByToken, getImportMarkdown } from "@/lib/data";

// Downloads a Markdown file exactly as it was imported. Developer link only.
export async function GET(_: Request, ctx: RouteContext<"/manage/[token]/imports/[id]">) {
  await connection();
  const { token, id } = await ctx.params;
  const found = await findDocumentByToken(token);
  if (!found || found.role !== "developer") return new Response("Not found", { status: 404 });
  const file = await getImportMarkdown(found.document.id, Number(id));
  if (!file) return new Response("Not found", { status: 404 });
  const name = (file.fileName || `import-${id}.md`).replace(/[^\w.\- ]/g, "_");
  return new Response(file.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
