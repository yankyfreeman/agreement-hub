import Link from "next/link";
import { reimportAction, updateDocumentAction } from "@/app/actions";
import { toExistingItems, type DocumentView as View, type SectionView } from "@/lib/data";
import { HighlightArea, HighlightButton } from "./highlight";
import { ImportForm } from "./import-form";
import { Markdown } from "./markdown";
import { Outline, type OutlineEntry } from "./outline";
import { ProgressView } from "./progress-view";
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

/**
 * Contents entries: group headings, sections under them, and the questions
 * by group with how many are answered. Targets are the ids rendered below.
 */
function toOutline(blocks: Block[]): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  for (const block of blocks) {
    if (block.type === "section") {
      const { section, heading } = block;
      if (heading) {
        entries.push({ target: `group-${section.id}`, label: heading, level: 0, status: null });
      }
      entries.push({
        target: `section-${section.id}`,
        label: section.current.title,
        level: section.group ? 1 : 0,
        status: section.status,
      });
      continue;
    }

    const groups: SectionView[][] = [];
    for (const q of block.questions) {
      const last = groups.at(-1);
      if (last && last[0].group === q.group) last.push(q);
      else groups.push([q]);
    }
    const summary = (qs: SectionView[]) => ({
      note: `${qs.filter((q) => q.status === "answered").length}/${qs.length}`,
      status: qs.some((q) => q.status === "followup")
        ? ("followup" as const)
        : qs.every((q) => q.status === "answered")
          ? ("answered" as const)
          : null,
    });
    const all = block.questions;
    const label = groups.length === 1 ? (all[0].group ?? "Questions") : "Questions";
    entries.push({ target: questionsId(all), label, level: 0, ...summary(all) });
    if (groups.length > 1) {
      for (const qs of groups) {
        entries.push({
          target: `qgroup-${qs[0].id}`,
          label: qs[0].group ?? "Questions",
          level: 1,
          ...summary(qs),
        });
      }
    }
  }
  return entries;
}

const questionsId = (questions: SectionView[]) => `questions-${questions[0].id}`;

export type Tab = "scope" | "progress";

export function DocumentView({ view, token, tab }: { view: View; token: string; tab: Tab }) {
  const { document: doc, role, sections } = view;
  const isDeveloper = role === "developer";
  const questionKeys = new Set(sections.filter((s) => s.kind === "question").map((s) => s.key));
  const props = { role, token, questionKeys };
  const blocks = toBlocks(sections);
  const outline = toOutline(blocks);
  // Clients see the Progress tab once there is something to show.
  const showTabs = isDeveloper || view.checks.length > 0;
  const onProgress = showTabs && tab === "progress";
  const showOutline = !onProgress && outline.length > 2;

  return (
    <div className="flex-1 bg-zinc-100 print:bg-white dark:bg-zinc-900/60">
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-8 print:block print:p-0">
        {showOutline && (
          <aside className="hidden w-56 shrink-0 lg:block print:hidden">
            <Outline entries={outline} variant="sidebar" />
          </aside>
        )}
        <main className="mx-auto w-full min-w-0 max-w-4xl space-y-6">
          <nav className="flex items-center justify-between print:hidden">
            <Link href="/" className="text-sm font-semibold">
              Agreement Hub
            </Link>
            <PrintButton />
          </nav>

          {isDeveloper && !onProgress && <DeveloperPanel view={view} token={token} />}

          {showTabs && <Tabs view={view} token={token} tab={onProgress ? "progress" : "scope"} />}

          {showOutline && <Outline entries={outline} variant="inline" />}

          {onProgress ? (
            <ProgressView view={view} />
          ) : (
            /* The document itself, laid out like a printed page */
            <HighlightArea className="doc rounded-sm bg-white px-5 py-10 shadow-sm ring-1 ring-zinc-200 sm:px-16 sm:py-14 print:px-0 print:py-0 print:shadow-none print:ring-0 dark:bg-zinc-950 dark:ring-zinc-800">
              <header className="mb-8 space-y-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
                <h1 className="text-3xl font-bold leading-tight tracking-tight">{doc.title}</h1>
                <p className="font-sans text-sm text-zinc-500">
                  Between <strong className="font-medium text-zinc-700 dark:text-zinc-300">{doc.clientName}</strong>{" "}
                  (client) and{" "}
                  <strong className="font-medium text-zinc-700 dark:text-zinc-300">{doc.developerName}</strong>{" "}
                  (developer) · version {doc.version} · last activity{" "}
                  <LocalTime iso={doc.updatedAt.toISOString()} />
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SummaryLine sections={sections} />
                  <HighlightButton count={sections.filter((s) => s.status === "agreed").length} />
                </div>
                {doc.intro && (
                  <div className="text-zinc-700 dark:text-zinc-300">
                    <Markdown text={doc.intro} />
                  </div>
                )}
                {sections.length > 0 && (
                  <p className="font-sans text-xs text-zinc-500 print:hidden">
                    {isDeveloper
                      ? "Hover over a section to reply or edit it, or over a question to reply."
                      : "Hover over a section (or tap the icons beside it) to agree, disagree or comment. Questions have a box for your answer."}
                  </p>
                )}
              </header>

              <div className="space-y-2">
                {blocks.map((block) =>
                  block.type === "questions" ? (
                    <div
                      key={`q-${block.questions[0].id}`}
                      id={questionsId(block.questions)}
                      className="scroll-mt-6"
                    >
                      <QuestionsBlock questions={block.questions} {...props} />
                    </div>
                  ) : (
                    <div key={block.section.id}>
                      {block.heading && (
                        <h2
                          id={`group-${block.section.id}`}
                          className="mb-1 mt-8 scroll-mt-6 text-2xl font-bold tracking-tight"
                        >
                          {block.heading}
                        </h2>
                      )}
                      <SectionBlock section={block.section} {...props} />
                    </div>
                  ),
                )}
                {sections.length === 0 && (
                  <p className="py-8 text-center font-sans text-sm text-zinc-500">Nothing to review yet.</p>
                )}
              </div>
            </HighlightArea>
          )}
        </main>
      </div>
    </div>
  );
}

/** Switches between the agreed scope and the build progress. */
function Tabs({ view, token, tab }: { view: View; token: string; tab: Tab }) {
  const base = `/${view.role === "developer" ? "manage" : "d"}/${token}`;
  const verified = view.checks.filter((c) => c.status === "passing").length;
  const tabs: [Tab, string, string][] = [
    ["scope", "Scope", base],
    [
      "progress",
      view.checks.length ? `Progress · ${verified}/${view.checks.length}` : "Progress",
      `${base}?view=progress`,
    ],
  ];
  return (
    <nav aria-label="Views" className="flex gap-1 border-b border-zinc-200 print:hidden dark:border-zinc-800">
      {tabs.map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={tab === key ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            tab === key
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
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

      <div className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-medium">Keep a copy in your project</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Agreement Hub keeps only the current and previous version of each section, with the
          messages about them. Keep both files in your project&apos;s{" "}
          <code className="text-xs">docs/scope/</code> folder and commit them before and after
          each update. Claude with the Agreement Hub skill does this for you.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href={`/manage/${token}/export/document`} className="underline" download>
            Document (.md)
          </a>
          <a href={`/manage/${token}/export/record`} className="underline" download>
            Conversation record (.md)
          </a>
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
            saveFirst={`/manage/${token}/export/record`}
            submitLabel="Apply update"
          />
        </div>
      </details>

      {view.imports.length > 0 && (
        <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium">
            Recent imports ({view.imports.length})
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
