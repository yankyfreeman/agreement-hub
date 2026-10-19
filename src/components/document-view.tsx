import Link from "next/link";
import { addSectionAction, updateDocumentAction } from "@/app/actions";
import type { DocumentView as View } from "@/lib/data";
import { SectionCard } from "./section-card";
import { StatusSummary } from "./status";
import { inputClass, labelClass } from "./styles";
import { CopyLink, LocalTime, PrintButton, SubmitButton } from "./ui";

export function DocumentView({ view, token }: { view: View; token: string }) {
  const { document: doc, role, sections } = view;
  const isDeveloper = role === "developer";

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <nav className="flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm font-semibold">
          Agreement Hub
        </Link>
        <PrintButton />
      </nav>

      {isDeveloper && (
        <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 print:hidden dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-sm font-medium">
            Developer view. Bookmark this page: it is the only way back in.
          </p>
          <div>
            <p className={labelClass}>Link for {doc.clientName}</p>
            <CopyLink path={`/d/${doc.shareToken}`} label="Copy client link" />
          </div>
        </section>
      )}

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
        <p className="text-sm text-zinc-500">
          Between <strong className="text-zinc-700 dark:text-zinc-300">{doc.clientName}</strong>{" "}
          (client) and{" "}
          <strong className="text-zinc-700 dark:text-zinc-300">{doc.developerName}</strong>{" "}
          (developer) · last activity <LocalTime iso={doc.updatedAt.toISOString()} />
        </p>
        {doc.intro && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {doc.intro}
          </p>
        )}
      </header>

      {isDeveloper && (
        <details className="rounded-lg border border-zinc-200 p-4 print:hidden dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium">Edit document details</summary>
          <form action={updateDocumentAction.bind(null, token)} className="mt-3 space-y-3">
            <DocumentFields
              defaults={doc}
            />
            <SubmitButton variant="secondary">Save details</SubmitButton>
          </form>
        </details>
      )}

      <StatusSummary sections={sections} />

      {!isDeveloper && sections.length > 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 print:hidden">
          Please go through each section below and tell us whether you agree, disagree or have a
          question. Everything is kept as a record for both sides.
        </p>
      )}

      <div className="space-y-4">
        {sections.map((s, i) => (
          <SectionCard key={s.id} section={s} index={i + 1} role={role} token={token} />
        ))}
        {sections.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            {isDeveloper
              ? "No sections yet. Add the first feature or requirement below."
              : "Nothing to review yet."}
          </p>
        )}
      </div>

      {isDeveloper && (
        <section className="rounded-lg border border-zinc-200 p-4 print:hidden dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold">Add a section</h2>
          <form action={addSectionAction.bind(null, token)} className="space-y-3">
            <input
              name="title"
              required
              placeholder="e.g. User login with email and password"
              className={inputClass}
            />
            <textarea
              name="body"
              rows={4}
              placeholder="Describe exactly what will be built, what is included and what is not…"
              className={inputClass}
            />
            <SubmitButton>Add section</SubmitButton>
          </form>
        </section>
      )}
    </main>
  );
}

export function DocumentFields({
  defaults,
}: {
  defaults?: { title: string; intro: string; clientName: string; developerName: string };
}) {
  return (
    <>
      <div>
        <label className={labelClass} htmlFor="title">
          Project / document title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="e.g. Booking app – phase 1 scope"
          className={inputClass}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="clientName">
            Client name
          </label>
          <input
            id="clientName"
            name="clientName"
            defaultValue={defaults?.clientName}
            placeholder="Client"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="developerName">
            Developer name
          </label>
          <input
            id="developerName"
            name="developerName"
            defaultValue={defaults?.developerName}
            placeholder="Developer"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="intro">
          Introduction (optional)
        </label>
        <textarea
          id="intro"
          name="intro"
          rows={3}
          defaultValue={defaults?.intro}
          placeholder="Context for the client: goals, timeline, how to use this page…"
          className={inputClass}
        />
      </div>
    </>
  );
}
