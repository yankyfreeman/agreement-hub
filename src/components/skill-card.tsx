import Link from "next/link";

// Built from skill/agreement-hub-scope (see skill/README.md).
const SKILL_ZIP = "/agreement-hub-scope.zip";

/** Download and install steps for the Claude skill that writes scope documents in our format. */
export function SkillCard({ showGuideLink = false }: { showGuideLink?: boolean }) {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Use with Claude: no format to learn</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Add the Agreement Hub skill to Claude once. Then just talk through your project and
            ask for a scope document: Claude writes it in the right format, ready to import here.
            It also updates the document after your client responds, without losing what was
            already agreed.
          </p>
        </div>
        <a
          href={SKILL_ZIP}
          download
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Download skill
        </a>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium">Claude app (web or desktop)</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-zinc-600 dark:text-zinc-400">
            <li>Go to Customize → Skills.</li>
            <li>Click +, then Create skill → Upload a skill.</li>
            <li>Choose the downloaded ZIP file.</li>
          </ol>
          <p className="mt-1 text-xs text-zinc-500">
            Needs &quot;Code execution and file creation&quot; turned on in Settings → Capabilities.
          </p>
        </div>
        <div>
          <p className="font-medium">Claude Code</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Unzip it into <code className="text-xs">~/.claude/skills/</code>.
          </p>
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Then ask: <em>&quot;Make a scope document for the client.&quot;</em>
        {showGuideLink && (
          <>
            {" "}
            Using a different AI assistant?{" "}
            <Link href="/guide#prompt" className="underline">
              Copy our prompt instead
            </Link>
            .
          </>
        )}
      </p>
    </section>
  );
}
