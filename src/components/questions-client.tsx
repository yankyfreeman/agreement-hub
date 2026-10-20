"use client";

import { PencilLine } from "lucide-react";
import { useState } from "react";
import { SubmitButton } from "./ui";

/**
 * Wraps the client's questions in one form. The "Send answers" bar only
 * appears once something has been typed, so the page stays a document.
 */
export function QuestionsForm({
  action,
  children,
}: {
  action: (form: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const [drafted, setDrafted] = useState(0);

  return (
    <form
      action={async (form) => {
        await action(form);
        setDrafted(0);
      }}
      onInput={(e) => {
        const boxes = e.currentTarget.querySelectorAll("textarea");
        setDrafted([...boxes].filter((b) => b.value.trim()).length);
      }}
      className="space-y-1"
    >
      {children}
      {drafted > 0 && (
        <div className="sticky bottom-3 z-10 mt-4 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 font-sans shadow-sm print:hidden dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {drafted} {drafted === 1 ? "answer" : "answers"} ready
          </span>
          <SubmitButton>Send answers</SubmitButton>
        </div>
      )}
    </form>
  );
}

/** A small answer box, visible by default; collapsed behind a pencil once answered. */
export function AnswerField({
  name,
  label,
  open: initiallyOpen,
}: {
  name: string;
  label: string;
  open: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 inline-flex items-center gap-1 font-sans text-xs text-zinc-500 hover:text-zinc-800 print:hidden dark:hover:text-zinc-200"
      >
        <PencilLine size={13} /> Change or add to your answer
      </button>
    );
  }

  return (
    <textarea
      name={name}
      aria-label={label}
      rows={1}
      autoFocus={!initiallyOpen}
      placeholder="Your answer…"
      className="mt-2 block min-h-9 w-full resize-none rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 font-sans text-sm [field-sizing:content] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none print:hidden dark:border-zinc-700"
    />
  );
}
