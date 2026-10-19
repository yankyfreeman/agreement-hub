import Link from "next/link";
import { reimportAction, updateDocumentAction } from "@/app/actions";
import { toExistingItems, type DocumentView as View, type SectionView } from "@/lib/data";
import { ImportForm } from "./import-form";
import { Markdown } from "./markdown";
import { QuestionsBlock } from "./questions-block";
import { SectionCard } from "./section-card";
import { StatusSummary } from "./status";
import { inputClass, labelClass } from "./styles";
import { CopyLink, LocalTime, PrintButton, SubmitButton } from "./ui";

type Block =
  | { type: "section"; section: SectionView; heading: string | null }
  | { type: "questions"; questions: SectionView[] };

/** Groups consecutive questions together and adds a heading where a section's group changes. */
function toBlocks(items: SectionView[]): Block[] {
  const blocks: Block[] = [];
  let lastGroup: string | null = null;
  for (const item of items) {
    const last = blocks.at(-1);
    if (item.kind === "question") {
      if (last?.type === "questions") last.questions.push(item);
      else blocks.push({ type: "questions", questions: [item] });
      lastGroup = null;
    } else {
      const heading = item.group && item.group !== lastGroup ? item.group : null;
      blocks.push({ type: "section", section: item, heading });
      lastGroup = item.group;
    }
  }
  return blocks;
}

export function DocumentView({ view, token }: { view: View; token: string }) {
  const { document: doc, role, sections } = view;
  const isDeveloper = role === "developer";
  const live = sections.filter((s) => !s.archived);
  const archived = sections.filter((s) => s.archived);
  const questionKeys = new Set(live.filter((s) => s.kind === "question").map((s) => s.key));
  const props = { role, token, questionKeys };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <nav className="flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm font-semibold">
          Agreement Hub
        </Link>
        <PrintButton />
      </nav>

      {isDeveloper && <DeveloperPanel view={view} token={token} />}

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
        <p className="text-sm text-zinc-500">
          Between <strong className="text-zinc-700 dark:text-zinc-300">{doc.clientName}</strong>{" "}
          (client) and{" "}
          <strong className="text-zinc-700 dark:text-zinc-300">{doc.developerName}</strong>{" "}
          (developer) · last activity <LocalTime iso={doc.updatedAt.toISOString()} />
        </p>
        {doc.intro && (
          <div className="text-zinc-700 dark:text-zinc-300">
            <Markdown text={doc.intro} />
          </div>
        )}
      </header>

      <StatusSummary sections={sections} />

      {!isDeveloper && live.length > 0 && (
        <p className="text-sm text-zinc-600 print:hidden dark:text-zinc-400">
          Please go through each section and tell us whether you agree, disagree or have a
          question, and answer the questions further down. Everything is kept as a record for
          both sides.
        </p>
      )}

      <div className="space-y-4">
        {toBlocks(live).map((block) =>
          block.type === "questions" ? (
            <QuestionsBlock key={`q-${block.questions[0].id}`} questions={block.questions} {...props} />
          ) : (
            <div key={block.section.id} className="space-y-3">
              {block.heading && <h2 className="pt-4 text-lg font-semibold">{block.heading}</h2>}
              <SectionCard section={block.section} {...props} />
            </div>
          ),
        )}
        {live.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nothing to review yet.
          </p>
        )}
      </div>

      {archived.length > 0 && (
        <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium">
            Removed in later versions ({archived.length})
          </summary>
          <p className="mt-2 text-xs text-zinc-500">
            These items are no longer in the document. They are kept, with their responses, for
            the record.
          </p>
          <div className="mt-3 space-y-3 opacity-80">
            {toBlocks(archived).map((block) =>
              block.type === "questions" ? (
                <QuestionsBlock
                  key={`aq-${block.questions[0].id}`}
                  questions={block.questions}
                  {...props}
                  role="developer"
                />
              ) : (
                <SectionCard key={block.section.id} section={block.section} {...props} />
              ),
            )}
          </div>
        </details>
      )}
    </main>
  );
}

function DeveloperPanel({ view, token }: { view: View; token: string }) {
  const { document: doc } = view;
  return (
    <section className="space-y-4 print:hidden">
      <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
        <p className="text-sm font-medium">
          Developer view. Bookmark this page: it is the only way back in.
        </p>
        <div>
          <p className={labelClass}>Link for {doc.clientName}</p>
          <CopyLink path={`/d/${doc.shareToken}`} label="Copy client link" />
        </div>
      </div>

      <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium">
          Import an updated Markdown version
        </summary>
        <div className="mt-3">
          <ImportForm
            action={reimportAction.bind(null, token)}
            existing={toExistingItems(view)}
            submitLabel="Apply update"
          />
        </div>
      </details>

      {view.imports.length > 0 && (
        <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium">
            Import history ({view.imports.length})
          </summary>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {view.imports.map((imp) => (
              <li key={imp.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{imp.fileName || "Imported file"}</p>
                  <p className="text-xs text-zinc-500">
                    <LocalTime iso={imp.createdAt.toISOString()} /> · {imp.summary}
                  </p>
                </div>
                <a
                  href={`/manage/${token}/imports/${imp.id}`}
                  className="text-sm underline"
                  download
                >
                  Download .md
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium">Edit document details</summary>
        <form action={updateDocumentAction.bind(null, token)} className="mt-3 space-y-3">
          <div>
            <label className={labelClass} htmlFor="title">
              Title
            </label>
            <input id="title" name="title" required defaultValue={doc.title} className={inputClass} />
          </div>
          <PartyFields clientName={doc.clientName} developerName={doc.developerName} />
          <div>
            <label className={labelClass} htmlFor="intro">
              Introduction
            </label>
            <textarea
              id="intro"
              name="intro"
              rows={4}
              defaultValue={doc.intro}
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <SubmitButton variant="secondary">Save details</SubmitButton>
        </form>
      </details>
    </section>
  );
}

export function PartyFields({
  clientName,
  developerName,
}: {
  clientName?: string;
  developerName?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor="clientName">
          Client name
        </label>
        <input
          id="clientName"
          name="clientName"
          defaultValue={clientName}
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
          defaultValue={developerName}
          placeholder="Developer"
          className={inputClass}
        />
      </div>
    </div>
  );
}
