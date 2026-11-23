import Link from "next/link";
import { createFromMarkdownAction } from "./actions";
import { PartyFields } from "@/components/document-view";
import { ConnectCard } from "@/components/connect-card";
import { ImportForm } from "@/components/import-form";
import { SkillCard } from "@/components/skill-card";

const STEPS = [
  ["Write the scope with Claude", "Plan the project with Claude and our skill. It gives you a file that is ready to import."],
  ["Import it", "Sections and Q1, Q2… questions are picked up automatically. Check the preview."],
  ["Share one link", "The client agrees or disagrees per section and answers the questions in one go."],
  ["Update and keep the record", "Re-import the next version. Your project keeps the full history; ag-hub keeps the latest two."],
];

const AI_PLANNING = [
  [
    "Asks what you both missed",
    "Claude reviews the scope and every client response for gaps: unclear rules, edge cases and real-world situations, like a refund after the deadline or two customers booking the last slot. They become questions now, not surprises mid-build.",
  ],
  [
    "Turns the agreement into specs and tasks",
    "Once the client agrees, Claude breaks the scope into feature specs, one testable line per behaviour linked to the section it came from, then a plan and tasks.",
  ],
  [
    "Keeps every version",
    "Each update gets a version number, and only the sections that changed go back to the client; everything already agreed stays agreed. Your project keeps one scope file that Claude updates and commits with each version, so Git holds the full history: what changed, when, and who agreed to it.",
  ],
  [
    "Shows the client real progress",
    "Test results flow back here, so your client sees which of the things they agreed to are built and verified.",
  ],
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold">ag-hub</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Get your client and your team on the same page.
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Plan your project scope with Claude, import it here and share it at one link. Your
          client responds under each section and answers your questions, and you keep a dated
          record of what was agreed, what was disputed and how it was settled.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Plan with AI, not just build with it</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            With the ag-hub skill, Claude follows the whole conversation between you and
            your client: every section, answer, objection and reply. It uses that to make the plan
            better, then carries it all the way into the build.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {AI_PLANNING.map(([title, text]) => (
            <li key={title} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The result: fewer surprises, less back-and-forth, and a straight line from the first
          conversation to working software. You make the decisions; Claude does the writing and
          the tracking.
        </p>
      </section>

      <SkillCard />

      <ConnectCard />

      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm font-semibold">
              {i + 1}. {title}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
          </li>
        ))}
      </ol>

      <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Import a scope document</h2>
          <Link href="/guide#without-claude" className="text-sm text-zinc-500 underline">
            Not using Claude?
          </Link>
        </div>
        <ImportForm action={createFromMarkdownAction} submitLabel="Create document">
          <PartyFields />
        </ImportForm>
      </section>
    </main>
  );
}
