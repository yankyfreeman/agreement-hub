import { postMessageAction, reviseSectionAction } from "@/app/actions";
import type { Role } from "@/db";
import type { Message, SectionView } from "@/lib/data";
import { StatusBadge } from "./status";
import { inputClass, labelClass } from "./styles";
import { LocalTime, SubmitButton } from "./ui";

const KIND_LABEL: Record<Message["kind"], string> = {
  agree: "Agreed",
  disagree: "Disagreed",
  question: "Asked a question",
  comment: "Commented",
};

const KIND_ACCENT: Record<Message["kind"], string> = {
  agree: "border-l-emerald-500",
  disagree: "border-l-red-500",
  question: "border-l-amber-500",
  comment: "border-l-zinc-300 dark:border-l-zinc-600",
};

export function SectionCard({
  section,
  index,
  role,
  token,
}: {
  section: SectionView;
  index: number;
  role: Role;
  token: string;
}) {
  const { current } = section;

  return (
    <article
      id={`section-${section.id}`}
      className="break-inside-avoid rounded-lg border border-zinc-200 dark:border-zinc-800"
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">
            {index}. {current.title}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Version {current.version} · <LocalTime iso={current.createdAt.toISOString()} />
          </p>
        </div>
        <StatusBadge status={section.status} />
      </header>

      <div className="space-y-4 p-4">
        {current.body ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {current.body}
          </p>
        ) : (
          <p className="text-sm italic text-zinc-500">No details.</p>
        )}

        {section.history.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
              Previous versions ({section.history.length})
            </summary>
            <ol className="mt-2 space-y-3 border-l-2 border-zinc-200 pl-3 dark:border-zinc-700">
              {section.history.map((v) => (
                <li key={v.id}>
                  <p className="text-xs text-zinc-500">
                    Version {v.version} · <LocalTime iso={v.createdAt.toISOString()} />
                  </p>
                  <p className="font-medium">{v.title}</p>
                  <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{v.body}</p>
                </li>
              ))}
            </ol>
          </details>
        )}

        {role === "developer" && (
          <details className="text-sm print:hidden">
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
              Edit section
            </summary>
            <form
              action={reviseSectionAction.bind(null, token, section.id)}
              className="mt-3 space-y-3"
            >
              <input name="title" defaultValue={current.title} required className={inputClass} />
              <textarea
                name="body"
                defaultValue={current.body}
                rows={5}
                className={inputClass}
              />
              <p className="text-xs text-zinc-500">
                Saving creates version {current.version + 1}. The client will need to respond
                again.
              </p>
              <SubmitButton variant="secondary">Save new version</SubmitButton>
            </form>
          </details>
        )}

        <Thread messages={section.messages} currentVersion={current.version} />

        <div className="print:hidden">
          {role === "client" ? (
            <ClientResponseForm token={token} sectionId={section.id} />
          ) : (
            <form action={postMessageAction.bind(null, token, section.id)} className="space-y-2">
              <label className={labelClass} htmlFor={`reply-${section.id}`}>
                Reply to client
              </label>
              <textarea
                id={`reply-${section.id}`}
                name="body"
                rows={2}
                required
                placeholder="Answer a question or explain a change…"
                className={inputClass}
              />
              <SubmitButton variant="secondary">Send reply</SubmitButton>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function Thread({ messages, currentVersion }: { messages: Message[]; currentVersion: number }) {
  if (!messages.length) return null;
  return (
    <ol className="space-y-2">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`rounded-md border-l-4 bg-zinc-50 p-3 text-sm dark:bg-zinc-900 ${KIND_ACCENT[m.kind]}`}
        >
          <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{m.authorName}</span>
            <span className="rounded bg-zinc-200 px-1.5 py-px dark:bg-zinc-700">
              {m.role === "client" ? "Client" : "Developer"}
            </span>
            <span>{m.role === "developer" ? "Replied" : KIND_LABEL[m.kind]}</span>
            <span>·</span>
            <LocalTime iso={m.createdAt.toISOString()} />
            {m.version !== currentVersion && <span>· on version {m.version}</span>}
          </p>
          {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
        </li>
      ))}
    </ol>
  );
}

const CHOICES = [
  { kind: "agree", label: "Agree", hint: "This is correct" },
  { kind: "question", label: "Question", hint: "I need clarification" },
  { kind: "disagree", label: "Disagree", hint: "This needs to change" },
  { kind: "comment", label: "Comment", hint: "Just a note" },
] as const;

function ClientResponseForm({ token, sectionId }: { token: string; sectionId: number }) {
  return (
    <form action={postMessageAction.bind(null, token, sectionId)} className="space-y-3">
      <fieldset>
        <legend className={labelClass}>Your response</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHOICES.map((c, i) => (
            <label
              key={c.kind}
              className="flex cursor-pointer flex-col rounded-md border border-zinc-300 px-3 py-2 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-700 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-800"
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name="kind" value={c.kind} defaultChecked={i === 0} required />
                {c.label}
              </span>
              <span className="text-xs text-zinc-500">{c.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <textarea
        name="body"
        rows={2}
        placeholder="Add details (required unless you agree)…"
        className={inputClass}
      />
      <SubmitButton>Submit response</SubmitButton>
    </form>
  );
}
