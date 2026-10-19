import { submitAnswersAction } from "@/app/actions";
import type { Role } from "@/db";
import type { SectionView } from "@/lib/data";
import { Markdown } from "./markdown";
import { History, ReplyForm, Thread } from "./section-card";
import { StatusBadge } from "./status";
import { inputClass } from "./styles";
import { SubmitButton } from "./ui";

/**
 * A run of consecutive questions. The client answers them all in one form and
 * submits once; the developer replies (or asks for more) per question.
 */
export function QuestionsBlock({
  questions,
  role,
  token,
  questionKeys,
}: {
  questions: SectionView[];
  role: Role;
  token: string;
  questionKeys: Set<string>;
}) {
  const items = questions.map((q, i) => (
    <QuestionItem
      key={q.id}
      question={q}
      showGroup={q.group !== questions[i - 1]?.group}
      role={role}
      token={token}
      questionKeys={questionKeys}
    />
  ));

  if (role === "developer") return <div className="space-y-3">{items}</div>;

  return (
    <form action={submitAnswersAction.bind(null, token)} className="space-y-3">
      {items}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-zinc-200 bg-[var(--background)] py-3 print:hidden dark:border-zinc-800">
        <SubmitButton>Submit answers</SubmitButton>
        <p className="text-xs text-zinc-500">
          Blank answers are skipped, so you can answer some now and the rest later.
        </p>
      </div>
    </form>
  );
}

function QuestionItem({
  question: q,
  showGroup,
  role,
  token,
  questionKeys,
}: {
  question: SectionView;
  showGroup: boolean;
  role: Role;
  token: string;
  questionKeys: Set<string>;
}) {
  const number = q.key.replace(/^Q/i, "");
  return (
    <>
      {showGroup && q.group && <h3 className="pt-2 text-sm font-semibold">{q.group}</h3>}
      <article
        id={`q-${number}`}
        className="scroll-mt-4 break-inside-avoid rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {q.key}
          </span>
          <div className="min-w-0 flex-1">
            <Markdown text={q.current.body} questionKeys={questionKeys} />
          </div>
          {!q.archived && <StatusBadge status={q.status} />}
        </div>

        <div className="mt-3 space-y-3 pl-0 sm:pl-10">
          <History section={q} />
          <Thread messages={q.messages} currentVersion={q.current.version} />
          {!q.archived &&
            (role === "developer" ? (
              <div className="print:hidden">
                <ReplyForm token={token} sectionId={q.id} allowFollowUp />
              </div>
            ) : (
              <textarea
                name={`answer-${q.id}`}
                rows={2}
                aria-label={`Answer to ${q.key}`}
                placeholder={q.status === "unanswered" ? "Your answer…" : "Add to your answer…"}
                className={`${inputClass} print:hidden`}
              />
            ))}
        </div>
      </article>
    </>
  );
}
