import { createDocumentAction } from "./actions";
import { DocumentFields } from "@/components/document-view";
import { SubmitButton } from "@/components/ui";

const STEPS = [
  ["Write the scope", "Split the functionality into sections, one feature or requirement each."],
  ["Share one link", "Send the client link. No sign-up needed on either side."],
  ["Agree section by section", "The client agrees, disagrees or asks a question under each section."],
  ["Keep the record", "Every response and every edit is kept, with dates and versions."],
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
          Share the functionality document at one link. Your client responds under each section,
          and you keep a dated record of what was agreed, what was disputed and how it was
          settled.
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
        <h2 className="mb-4 text-lg font-semibold">Start a new document</h2>
        <form action={createDocumentAction} className="space-y-3">
          <DocumentFields />
          <SubmitButton>Create document</SubmitButton>
        </form>
      </section>
    </main>
  );
}
