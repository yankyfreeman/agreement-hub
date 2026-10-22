import type { SectionView } from "@/lib/data";

/** One line under the title: "3 of 14 sections agreed · 1 disagreed · 2 of 19 questions answered" */
export function SummaryLine({ sections }: { sections: SectionView[] }) {
  const reviewable = sections.filter((s) => s.kind === "section" && !s.infoOnly);
  const questions = sections.filter((s) => s.kind === "question");
  const n = (items: SectionView[], status: SectionView["status"]) =>
    items.filter((s) => s.status === status).length;

  const parts: { text: string; className?: string }[] = [];
  if (reviewable.length) {
    parts.push({ text: `${n(reviewable, "agreed")} of ${reviewable.length} sections agreed` });
    if (n(reviewable, "disagreed"))
      parts.push({
        text: `${n(reviewable, "disagreed")} disagreed`,
        className: "text-red-700 dark:text-red-400",
      });
    if (n(reviewable, "question"))
      parts.push({
        text: `${n(reviewable, "question")} with questions`,
        className: "text-amber-700 dark:text-amber-400",
      });
  }
  if (questions.length) {
    parts.push({ text: `${n(questions, "answered")} of ${questions.length} questions answered` });
    if (n(questions, "followup"))
      parts.push({
        text: `${n(questions, "followup")} need more detail`,
        className: "text-amber-700 dark:text-amber-400",
      });
  }
  if (!parts.length) return null;

  return (
    <p className="font-sans text-sm text-zinc-600 dark:text-zinc-400">
      {parts.map((p, i) => (
        <span key={p.text} className={p.className}>
          {i > 0 && <span className="text-zinc-400"> · </span>}
          {p.text}
        </span>
      ))}
    </p>
  );
}
