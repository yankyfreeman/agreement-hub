// Built from skill/agreement-hub-scope (see skill/README.md).
const SKILL_ZIP = "/agreement-hub-scope.zip";

/** The recommended way to write a scope document: the Claude skill, with download and install steps. */
export function SkillCard() {
  return (
    <section className="space-y-4 rounded-lg border-2 border-zinc-900 p-5 dark:border-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-block rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            Recommended
          </p>
          <h2 className="text-lg font-semibold">Write your scope with Claude</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Add the Agreement Hub skill to Claude once. Then just talk through your project and
            ask for a scope document: Claude writes it ready to import, with no format to learn.
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

      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          Then ask: <em>&quot;Make a scope document for the client.&quot;</em>
        </p>
        <p>
          Already have a document? Give it to Claude and ask it to prepare it for Agreement Hub.
        </p>
      </div>
    </section>
  );
}
