import { Circle, CircleCheck, CircleX } from "lucide-react";
import type { DocumentView, SectionView, SpecCheck } from "@/lib/data";
import { LocalTime } from "./ui";

/**
 * Build progress against the agreed scope: each section's spec checks, which
 * turn verified when their tests pass. The client sees verified or not yet;
 * the developer also sees failing checks and sections without checks.
 */
export function ProgressView({ view }: { view: DocumentView }) {
  const isDeveloper = view.role === "developer";
  const { checks } = view;
  const bySection = new Map<number, SpecCheck[]>();
  for (const c of checks) bySection.set(c.sectionId, [...(bySection.get(c.sectionId) ?? []), c]);

  const agreed = view.sections.filter((s) => s.kind === "section");
  const shown = agreed.filter((s) => bySection.has(s.id) || (isDeveloper && !s.infoOnly));
  const notPlanned = agreed.filter((s) => !s.infoOnly && !bySection.has(s.id)).length;
  const verified = checks.filter((c) => c.status === "passing").length;
  const failing = checks.filter((c) => c.status === "failing").length;
  const lastChecked = checks
    .map((c) => c.checkedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <article className="rounded-sm bg-white px-5 py-8 shadow-sm ring-1 ring-zinc-200 sm:px-12 sm:py-10 dark:bg-zinc-950 dark:ring-zinc-800">
      <header className="mb-8 space-y-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isDeveloper
            ? "Each check is one line of a feature spec in your project, tied to the section it implements. It shows as verified when its tests pass."
            : "Each check is something you agreed to. It turns green when an automated test confirms it works."}
        </p>
        {checks.length > 0 ? (
          <div className="space-y-2">
            <Bar value={verified} total={checks.length} />
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              <strong className="font-semibold">
                {verified} of {checks.length}
              </strong>{" "}
              checks verified
              {isDeveloper && failing > 0 && (
                <span className="text-red-700 dark:text-red-400"> · {failing} failing</span>
              )}
              {lastChecked && (
                <span className="text-zinc-500">
                  {" "}
                  · last checked <LocalTime iso={lastChecked.toISOString()} />
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            No specs yet. With the ag-hub skill and connector, ask Claude to{" "}
            <em>&quot;write the specs for this scope&quot;</em>: it writes them in your project and
            syncs them here. As tests pass, the checks turn green for you and the client.
          </p>
        )}
      </header>

      {checks.length > 0 && (
        <div className="space-y-8">
          {shown.map((s) => (
            <SectionProgress key={s.id} section={s} checks={bySection.get(s.id) ?? []} isDeveloper={isDeveloper} />
          ))}
          {!isDeveloper && notPlanned > 0 && (
            <p className="text-sm text-zinc-500">
              {notPlanned} agreed {notPlanned === 1 ? "section doesn't" : "sections don't"} have checks
              yet.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function SectionProgress({
  section,
  checks,
  isDeveloper,
}: {
  section: SectionView;
  checks: SpecCheck[];
  isDeveloper: boolean;
}) {
  const verified = checks.filter((c) => c.status === "passing").length;
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          {section.group && <p className="text-xs text-zinc-500">{section.group}</p>}
          <h2 className="font-semibold">{section.current.title}</h2>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {checks.length ? `${verified} of ${checks.length} verified` : "No checks yet"}
        </p>
      </div>
      {checks.length > 0 && (
        <>
          <Bar value={verified} total={checks.length} small />
          <ul className="space-y-1.5 pt-1">
            {checks.map((c) => (
              <CheckLine key={c.id} check={c} isDeveloper={isDeveloper} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CheckLine({ check, isDeveloper }: { check: SpecCheck; isDeveloper: boolean }) {
  const failing = isDeveloper && check.status === "failing";
  const [Icon, color, label] =
    check.status === "passing"
      ? [CircleCheck, "text-emerald-600 dark:text-emerald-400", "Verified"]
      : failing
        ? [CircleX, "text-red-600 dark:text-red-400", "Failing"]
        : [Circle, "text-zinc-400", isDeveloper ? "Not built yet" : "Not verified yet"];
  return (
    <li className="flex gap-2 text-sm">
      <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-label={label} />
      <span className="min-w-0">
        <span className="mr-1.5 font-mono text-xs text-zinc-500">{check.key}</span>
        {/* Spec lines are Markdown; show them as plain text. */}
        {check.text.replace(/\*\*|__|`/g, "")}
        {failing && <span className="ml-1.5 text-xs font-medium text-red-700 dark:text-red-400">failing</span>}
      </span>
    </li>
  );
}

function Bar({ value, total, small = false }: { value: number; total: number; small?: boolean }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${small ? "h-1.5" : "h-2.5"}`}
    >
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
