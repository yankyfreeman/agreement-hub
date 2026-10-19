import Link from "next/link";
import { createFromMarkdownAction } from "./actions";
import { PartyFields } from "@/components/document-view";
import { ImportForm } from "@/components/import-form";

const STEPS = [
  ["Write the scope with AI", "Work out the scope with your AI assistant and save it as a Markdown file."],
  ["Import it", "Sections and Q1, Q2… questions are picked up automatically. Check the preview."],
  ["Share one link", "The client agrees or disagrees per section and answers the questions in one go."],
  ["Update and keep the record", "Re-import the next version. Changes are versioned; nothing is lost."],
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold">Agreement Hub</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Get your client and your team on the same page.
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Import your scope document as Markdown and share it at one link. Your client responds
          under each section and answers your questions, and you keep a dated record of what was
          agreed, what was disputed and how it was settled.
        </p>
      </header>

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
          <Link href="/guide" className="text-sm underline">
            How to format it (with AI prompt)
          </Link>
        </div>
        <ImportForm action={createFromMarkdownAction} submitLabel="Create document">
          <PartyFields />
        </ImportForm>
      </section>
    </main>
  );
}
