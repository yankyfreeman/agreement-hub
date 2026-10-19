import type { SectionView, Status } from "@/lib/data";

const STATUS: Record<Status, { label: string; className: string; bar: string }> = {
  agreed: {
    label: "Agreed",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  disagreed: {
    label: "Disagreed",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    bar: "bg-red-500",
  },
  question: {
    label: "Question",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  pending: {
    label: "Awaiting client",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    bar: "bg-zinc-300 dark:bg-zinc-600",
  },
};

const ORDER: Status[] = ["agreed", "question", "disagreed", "pending"];

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

export function StatusSummary({ sections }: { sections: SectionView[] }) {
  const total = sections.length;
  if (!total) return null;
  const counts = Object.fromEntries(
    ORDER.map((st) => [st, sections.filter((s) => s.status === st).length]),
  ) as Record<Status, number>;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Overall status</h2>
        <span className="text-sm text-zinc-500">
          {counts.agreed} of {total} sections agreed
        </span>
      </div>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {ORDER.map((st) =>
          counts[st] ? (
            <div
              key={st}
              className={STATUS[st].bar}
              style={{ width: `${(counts[st] / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-2">
        {ORDER.map((st) => (
          <li key={st} className="flex items-center gap-1.5 text-sm">
            <StatusBadge status={st} />
            <span className="text-zinc-600 dark:text-zinc-400">{counts[st]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
