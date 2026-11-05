"use client";

import {
  MessageCircle,
  MessageSquareReply,
  PencilLine,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { inputClass } from "./styles";
import { SubmitButton } from "./ui";

type Panel = "disagree" | "comment" | "reply" | "edit";

/**
 * The icons beside a block of the document (shown on hover), and the small
 * form that opens under the block when one is clicked. Nothing form-like is
 * visible until the reader chooses to react.
 *
 * - section:      agree (one click), disagree, comment / ask
 * - info:         comment only
 * - dev-section:  reply, edit
 * - dev-question: reply / ask for more detail
 */
export function ItemActions({
  mode,
  respond,
  revise,
  title,
  body,
  version,
  agreed = false,
}: {
  mode: "section" | "info" | "dev-section" | "dev-question";
  respond: (form: FormData) => Promise<void>;
  revise?: (form: FormData) => Promise<void>;
  title?: string;
  body?: string;
  version?: number;
  /** The client already agreed to this version: Agree shows as given and can't be sent again. */
  agreed?: boolean;
}) {
  const [open, setOpen] = useState<Panel | null>(null);
  const toggle = (p: Panel) => setOpen((o) => (o === p ? null : p));
  const submit = (action: (form: FormData) => Promise<void>) => async (form: FormData) => {
    await action(form);
    setOpen(null);
  };

  return (
    <>
      <div
        data-open={open !== null}
        className="item-actions absolute -right-1 top-0 flex flex-col gap-1 font-sans print:hidden sm:-right-12"
      >
        {mode === "section" && (
          <>
            <form action={respond}>
              <input type="hidden" name="kind" value="agree" />
              <AgreeButton agreed={agreed} />
            </form>
            <IconButton label="Disagree" active={open === "disagree"} onClick={() => toggle("disagree")}>
              <ThumbsDown size={16} />
            </IconButton>
          </>
        )}
        {(mode === "section" || mode === "info") && (
          <IconButton
            label={mode === "info" ? "Comment" : "Comment or ask a question"}
            active={open === "comment"}
            onClick={() => toggle("comment")}
          >
            <MessageCircle size={16} />
          </IconButton>
        )}
        {(mode === "dev-section" || mode === "dev-question") && (
          <IconButton label="Reply" active={open === "reply"} onClick={() => toggle("reply")}>
            <MessageSquareReply size={16} />
          </IconButton>
        )}
        {mode === "dev-section" && revise && (
          <IconButton label="Edit section" active={open === "edit"} onClick={() => toggle("edit")}>
            <PencilLine size={16} />
          </IconButton>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 font-sans print:hidden dark:border-zinc-800 dark:bg-zinc-900">
          {open === "disagree" && (
            <form action={submit(respond)} className="space-y-2">
              <input type="hidden" name="kind" value="disagree" />
              <PanelHeader title="What needs to change?" onClose={() => setOpen(null)} />
              <textarea name="body" rows={3} required autoFocus className={inputClass} />
              <SubmitButton>Send</SubmitButton>
            </form>
          )}

          {open === "comment" && (
            <form action={submit(respond)} className="space-y-2">
              <PanelHeader
                title={mode === "info" ? "Comment" : "Comment or question"}
                onClose={() => setOpen(null)}
              />
              {mode === "section" ? (
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="kind" value="question" defaultChecked /> Ask a question
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="kind" value="comment" /> Just a note
                  </label>
                </div>
              ) : (
                <input type="hidden" name="kind" value="comment" />
              )}
              <textarea name="body" rows={3} required autoFocus className={inputClass} />
              <SubmitButton>Send</SubmitButton>
            </form>
          )}

          {open === "reply" && (
            <form action={submit(respond)} className="space-y-2">
              <PanelHeader title="Reply to client" onClose={() => setOpen(null)} />
              <textarea name="body" rows={3} required autoFocus className={inputClass} />
              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton>Send reply</SubmitButton>
                {mode === "dev-question" && (
                  <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <input type="checkbox" name="kind" value="followup" />
                    Ask for more detail (reopens the question)
                  </label>
                )}
              </div>
            </form>
          )}

          {open === "edit" && revise && (
            <form action={submit(revise)} className="space-y-2">
              <PanelHeader title="Edit section" onClose={() => setOpen(null)} />
              <input name="title" defaultValue={title} required className={inputClass} />
              <textarea
                name="body"
                defaultValue={body}
                rows={8}
                className={`${inputClass} font-mono text-xs`}
              />
              <p className="text-xs text-zinc-500">
                Saving creates version {(version ?? 0) + 1}. The client will need to respond
                again. For bigger changes, import the updated Markdown file instead.
              </p>
              <SubmitButton>Save new version</SubmitButton>
            </form>
          )}
        </div>
      )}
    </>
  );
}

const iconClass =
  "flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white";

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-expanded={active}
      onClick={onClick}
      className={`${iconClass} ${active ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-white" : ""}`}
    >
      {children}
    </button>
  );
}

function AgreeButton({ agreed }: { agreed: boolean }) {
  const { pending } = useFormStatus();
  if (agreed) {
    return (
      <button
        type="button"
        title="You agreed to this section"
        aria-label="Agreed"
        aria-disabled
        className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-emerald-600 bg-emerald-600 text-white"
      >
        <ThumbsUp size={16} />
      </button>
    );
  }
  return (
    <button type="submit" title="Agree" aria-label="Agree" disabled={pending} className={iconClass}>
      <ThumbsUp size={16} />
    </button>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">{title}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        <X size={16} />
      </button>
    </div>
  );
}
