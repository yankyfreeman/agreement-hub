import { postMessageAction, submitAnswersAction } from "@/app/actions";
import type { Role } from "@/db";
import type { SectionView } from "@/lib/data";
import { ItemActions } from "./item-actions";
import { Markdown } from "./markdown";
import { AnswerField, QuestionsForm } from "./questions-client";
import { ItemMeta, MARKER } from "./section-card";

/**
 * A run of consecutive questions. A question always needs an answer, so the
 * client sees a small answer box under each open one and sends them together.
 * The developer replies (or asks for more detail) through the hover icons.
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

  if (role === "developer") {
    return <div className="space-y-1">{items}</div>;
  }
  return <QuestionsForm action={submitAnswersAction.bind(null, token)}>{items}</QuestionsForm>;
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
  // The client's latest answer to the current wording, shown as part of the document.
  const answer = q.messages.findLast(
    (m) => m.kind === "answer" && m.version === q.current.version,
  );

  return (
    <>
      {showGroup && q.group && (
        <h3 id={`qgroup-${q.id}`} className="scroll-mt-6 pt-5 pb-1 text-lg font-semibold">
          {q.group}
        </h3>
      )}
      <article
        id={`q-${number}`}
        className={`group relative -ml-4 scroll-mt-4 break-inside-avoid border-l-2 py-2 pl-[14px] pr-10 sm:pr-0 ${MARKER[q.status]}`}
      >
        <div className="flex gap-2">
          <span className="font-semibold">{q.key}.</span>
          <div className="min-w-0 flex-1">
            <Markdown text={q.current.body} questionKeys={questionKeys} />
          </div>
        </div>

        <div className="pl-8">
          {answer && q.status === "answered" && (
            <p className="mt-1 whitespace-pre-wrap border-l-2 border-zinc-200 pl-3 italic text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
              {answer.body}
            </p>
          )}
          {role === "client" && (
            <AnswerField
              // Remount when the answer or status changes, so the box collapses after sending.
              key={`${q.status}-${answer?.id ?? 0}`}
              name={`answer-${q.id}`}
              label={`Answer to ${q.key}`}
              open={q.status !== "answered"}
            />
          )}
          <ItemMeta section={q} shownId={q.status === "answered" ? answer?.id : undefined} />
        </div>

        {role === "developer" && (
          <ItemActions mode="dev-question" respond={postMessageAction.bind(null, token, q.id)} />
        )}
      </article>
    </>
  );
}
