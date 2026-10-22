import { postMessageAction, reviseSectionAction } from "@/app/actions";
import type { Role } from "@/db";
import type { Message, SectionView, Status } from "@/lib/data";
import { ItemActions } from "./item-actions";
import { Markdown } from "./markdown";
import { LocalTime } from "./ui";

const KIND_LABEL: Record<Message["kind"], string> = {
  agree: "Agreed",
  disagree: "Disagreed",
  question: "Asked a question",
  comment: "Commented",
  answer: "Answered",
  followup: "Asked for more detail",
};

const KIND_ACCENT: Record<Message["kind"], string> = {
  agree: "border-l-emerald-500",
  disagree: "border-l-red-500",
  question: "border-l-amber-500",
  comment: "border-l-zinc-300 dark:border-l-zinc-600",
  answer: "border-l-emerald-500",
  followup: "border-l-amber-500",
};

// Thin line in the left margin showing where things stand. Nothing until
// someone responds, so an untouched document looks like a plain document.
export const MARKER: Record<Status, string> = {
  agreed: "border-l-emerald-500",
  answered: "border-l-emerald-500",
  disagreed: "border-l-red-500",
  question: "border-l-amber-500",
  followup: "border-l-amber-500",
  pending: "border-l-transparent",
  unanswered: "border-l-transparent",
  info: "border-l-transparent",
};

const STATUS_TEXT: Partial<Record<Status, { label: string; className: string }>> = {
  agreed: { label: "Agreed", className: "text-emerald-700 dark:text-emerald-400" },
  disagreed: { label: "Disagreed", className: "text-red-700 dark:text-red-400" },
  question: { label: "Question raised", className: "text-amber-700 dark:text-amber-400" },
  answered: { label: "Answered", className: "text-emerald-700 dark:text-emerald-400" },
  followup: { label: "More detail requested", className: "text-amber-700 dark:text-amber-400" },
};

/** A section of the document: heading and text, with reactions on hover. */
export function SectionBlock({
  section,
  role,
  token,
  questionKeys,
}: {
  section: SectionView;
  role: Role;
  token: string;
  questionKeys: Set<string>;
}) {
  const { current } = section;
  const mode = role === "developer" ? "dev-section" : section.infoOnly ? "info" : "section";

  return (
    <article
      id={`section-${section.id}`}
      className={`group relative -ml-4 scroll-mt-6 break-inside-avoid border-l-2 py-2 pl-[14px] pr-10 sm:pr-0 ${MARKER[section.status]}`}
    >
      <h3 className="mb-1 text-lg font-semibold">{current.title}</h3>
      {current.body ? (
        <Markdown text={current.body} questionKeys={questionKeys} />
      ) : (
        <p className="text-sm italic text-zinc-500">No details.</p>
      )}
      <ItemMeta section={section} />
      {mode && (
        <ItemActions
          mode={mode}
          respond={postMessageAction.bind(null, token, section.id)}
          revise={
            role === "developer" ? reviseSectionAction.bind(null, token, section.id) : undefined
          }
          title={current.title}
          body={current.body}
          version={current.version}
        />
      )}
    </article>
  );
}

/**
 * One quiet line under a block ("Agreed · 2 messages · 1 earlier version")
 * that expands into the conversation and older versions.
 */
export function ItemMeta({ section }: { section: SectionView }) {
  const status = STATUS_TEXT[section.status];
  const count = section.messages.length;
  const earlier = section.history.length;
  if (!status && !count && !earlier) return null;

  const parts = [
    count ? `${count} ${count === 1 ? "message" : "messages"}` : null,
    earlier ? "previous version" : null,
  ].filter(Boolean);

  return (
    <details className="mt-2 font-sans text-xs">
      <summary className="cursor-pointer list-none text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        {status && <span className={`font-medium ${status.className}`}>{status.label}</span>}
        {status && parts.length > 0 && " · "}
        <span className="underline decoration-dotted underline-offset-2">{parts.join(" · ")}</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <Thread messages={section.messages} currentVersion={section.current.version} />
        <History section={section} />
      </div>
    </details>
  );
}

function History({ section }: { section: SectionView }) {
  if (!section.history.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-500">Previous version</p>
      <ol className="space-y-3 border-l-2 border-zinc-200 pl-3 dark:border-zinc-700">
        {section.history.map((v) => (
          <li key={v.id}>
            <p className="text-xs text-zinc-500">
              Version {v.version} · <LocalTime iso={v.createdAt.toISOString()} />
            </p>
            {section.kind === "section" && <p className="font-medium">{v.title}</p>}
            <div className="text-zinc-600 dark:text-zinc-400">
              <Markdown text={v.body} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Thread({ messages, currentVersion }: { messages: Message[]; currentVersion: number }) {
  if (!messages.length) return null;
  return (
    <ol className="space-y-2">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`rounded-md border-l-4 bg-zinc-50 p-3 dark:bg-zinc-900 ${KIND_ACCENT[m.kind]}`}
        >
          <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{m.authorName}</span>
            <span className="rounded bg-zinc-200 px-1.5 py-px dark:bg-zinc-700">
              {m.role === "client" ? "Client" : "Developer"}
            </span>
            <span>
              {m.role === "developer" && m.kind === "comment" ? "Replied" : KIND_LABEL[m.kind]}
            </span>
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
