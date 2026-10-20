import Link from "next/link";
import { reimportAction, updateDocumentAction } from "@/app/actions";
import { toExistingItems, type DocumentView as View, type SectionView } from "@/lib/data";
import { ImportForm } from "./import-form";
import { Markdown } from "./markdown";
import { QuestionsBlock } from "./questions-block";
import { SectionBlock } from "./section-card";
import { SummaryLine } from "./status";
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
    <div className="flex-1 bg-zinc-100 print:bg-white dark:bg-zinc-900/60">
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 print:p-0">
        <nav className="flex items-center justify-between print:hidden">
          <Link href="/" className="text-sm font-semibold">
            Agreement Hub
          </Link>
          <PrintButton />
        </nav>

        {isDeveloper && <DeveloperPanel view={view} token={token} />}

        {/* The document itself, laid out like a printed page */}
        <article className="doc rounded-sm bg-white px-5 py-10 shadow-sm ring-1 ring-zinc-200 sm:px-16 sm:py-14 print:px-0 print:py-0 print:shadow-none print:ring-0 dark:bg-zinc-950 dark:ring-zinc-800">
          <header className="mb-8 space-y-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">{doc.title}</h1>
            <p className="font-sans text-sm text-zinc-500">
              Between <strong className="font-medium text-zinc-700 dark:text-zinc-300">{doc.clientName}</strong>{" "}
              (client) and{" "}
              <strong className="font-medium text-zinc-700 dark:text-zinc-300">{doc.developerName}</strong>{" "}
              (developer) · last activity <LocalTime iso={doc.updatedAt.toISOString()} />
            </p>
            <SummaryLine sections={sections} />
            {doc.intro && (
              <div className="text-zinc-700 dark:text-zinc-300">
                <Markdown text={doc.intro} />
              </div>
            )}
            {live.length > 0 && (
              <p className="font-sans text-xs text-zinc-500 print:hidden">
                {isDeveloper
                  ? "Hover over a section to reply or edit it, or over a question to reply."
                  : "Hover over a section (or tap the icons beside it) to agree, disagree or comment. Questions have a box for your answer."}
              </p>
            )}
          </header>

          <div className="space-y-2">
            {toBlocks(live).map((block) =>
              block.type === "questions" ? (
                <QuestionsBlock
                  key={`q-${block.questions[0].id}`}
                  questions={block.questions}
                  {...props}
                />
              ) : (
                <div key={block.section.id}>
                  {block.heading && (
                    <h2 className="mb-1 mt-8 text-2xl font-bold tracking-tight">{block.heading}</h2>
                  )}
                  <SectionBlock section={block.section} {...props} />
                </div>
              ),
            )}
            {live.length === 0 && (
              <p className="py-8 text-center font-sans text-sm text-zinc-500">Nothing to review yet.</p>
            )}
          </div>

          {archived.length > 0 && (
            <details className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <summary className="cursor-pointer font-sans text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Removed in later versions ({archived.length})
              </summary>
              <p className="mt-2 font-sans text-xs text-zinc-500">
                These items are no longer in the document. They are kept, with their responses,
                for the record.
              </p>
              <div className="mt-4 space-y-2 opacity-75">
                {toBlocks(archived).map((block) =>
                  block.type === "questions" ? (
                    <QuestionsBlock
                      key={`aq-${block.questions[0].id}`}
                      questions={block.questions}
                      {...props}
                    />
                  ) : (
                    <SectionBlock key={block.section.id} section={block.section} {...props} />
                  ),
                )}
              </div>
            </details>
          )}
        </article>
      </main>
    </div>
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
