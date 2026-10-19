import type { SectionView, Status } from "@/lib/data";

const GREEN = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
const RED = "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
const AMBER = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
const GREY = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

const STATUS: Record<Status, { label: string; className: string; bar: string }> = {
  agreed: { label: "Agreed", className: GREEN, bar: "bg-emerald-500" },
  disagreed: { label: "Disagreed", className: RED, bar: "bg-red-500" },
  question: { label: "Question", className: AMBER, bar: "bg-amber-500" },
  pending: { label: "Awaiting client", className: GREY, bar: "bg-zinc-300 dark:bg-zinc-600" },
  info: { label: "Info", className: GREY, bar: "" },
  answered: { label: "Answered", className: GREEN, bar: "bg-emerald-500" },
  followup: { label: "Needs follow-up", className: AMBER, bar: "bg-amber-500" },
  unanswered: { label: "Unanswered", className: GREY, bar: "bg-zinc-300 dark:bg-zinc-600" },
};

const SECTION_ORDER: Status[] = ["agreed", "question", "disagreed", "pending"];
const QUESTION_ORDER: Status[] = ["answered", "followup", "unanswered"];

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function StatusSummary({ sections }: { sections: SectionView[] }) {
  const live = sections.filter((s) => !s.archived);
  const reviewable = live.filter((s) => s.kind === "section" && !s.infoOnly);
  const questions = live.filter((s) => s.kind === "question");
  if (!reviewable.length && !questions.length) return null;

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Overall status</h2>
      {reviewable.length > 0 && (
        <Row
          items={reviewable}
          order={SECTION_ORDER}
          headline={`${count(reviewable, "agreed")} of ${reviewable.length} sections agreed`}
        />
      )}
      {questions.length > 0 && (
        <Row
          items={questions}
          order={QUESTION_ORDER}
          headline={`${count(questions, "answered")} of ${questions.length} questions answered`}
        />
      )}
    </div>
  );
}

function count(items: SectionView[], status: Status) {
  return items.filter((s) => s.status === status).length;
}

function Row({
  items,
  order,
  headline,
}: {
  items: SectionView[];
  order: Status[];
  headline: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">{headline}</p>
      <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {order.map((st) => {
          const n = count(items, st);
          return n ? (
            <div
              key={st}
              className={STATUS[st].bar}
              style={{ width: `${(n / items.length) * 100}%` }}
            />
          ) : null;
        })}
      </div>
      <ul className="flex flex-wrap gap-2">
        {order.map((st) => (
          <li key={st} className="flex items-center gap-1.5 text-sm">
            <StatusBadge status={st} />
            <span className="text-zinc-600 dark:text-zinc-400">{count(items, st)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
