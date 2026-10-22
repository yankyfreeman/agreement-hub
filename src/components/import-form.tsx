"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import type { FormState } from "@/app/actions";
import {
  parseMarkdown,
  planImport,
  summarizePlan,
  type Change,
  type ExistingItem,
} from "@/lib/markdown-import";
import { inputClass, labelClass } from "./styles";
import { SubmitButton } from "./ui";

const CHANGE_STYLE: Record<Change, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  changed: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  unchanged: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

/** Downloads a file in full, so it is saved before anything else happens. */
async function download(href: string) {
  const res = await fetch(href);
  if (!res.ok) throw new Error(String(res.status));
  const name = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "record.md";
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

export function ImportForm({
  action,
  existing,
  saveFirst,
  children,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  /** Present when re-importing into an existing document. */
  existing?: ExistingItem[];
  /** A file to download before submitting, e.g. the conversation record before an update. */
  saveFirst?: string;
  /** Extra fields, e.g. client and developer names on create. */
  children?: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [markdown, setMarkdown] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!saveFirst) return;
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSaving(true);
    setSaveError(false);
    try {
      await download(saveFirst);
    } catch {
      setSaveError(true);
      return;
    } finally {
      setSaving(false);
    }
    startTransition(() => formAction(data));
  };

  const parsed = useMemo(() => (markdown.trim() ? parseMarkdown(markdown) : null), [markdown]);
  const plan = useMemo(
    () => (parsed && existing ? planImport(existing, parsed.items) : null),
    [parsed, existing],
  );

  const sectionCount = parsed?.items.filter((i) => i.kind === "section").length ?? 0;
  const questionCount = parsed?.items.filter((i) => i.kind === "question").length ?? 0;

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="markdown" value={markdown} />
      <input type="hidden" name="fileName" value={fileName} />

      <div>
        <label className={labelClass} htmlFor="md-file">
          Markdown file
        </label>
        <input
          id="md-file"
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setFileName(file.name);
            setMarkdown(await file.text());
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-zinc-500">…or paste the Markdown</summary>
          <textarea
            aria-label="Markdown"
            rows={8}
            value={markdown}
            onChange={(e) => {
              setMarkdown(e.target.value);
              if (!fileName) setFileName("pasted.md");
            }}
            className={`${inputClass} mt-2 font-mono text-xs`}
          />
        </details>
        <p className="mt-1 text-xs text-zinc-500">
          Files from the Agreement Hub skill for Claude import as they are.{" "}
          <Link href="/guide" className="underline" target="_blank">
            Get the skill
          </Link>
        </p>
      </div>

      {children}

      {parsed && (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Preview</p>
            <p className="font-semibold">{parsed.title || "(no # title found)"}</p>
            <p className="text-sm text-zinc-500">
              {sectionCount} sections · {questionCount} questions
              {plan && <> · {summarizePlan(plan)}</>}
            </p>
          </div>

          {parsed.items.length === 0 ? (
            <p className="text-sm text-red-600">
              No sections or questions found. Ask Claude, with the Agreement Hub skill, to prepare
              this document for Agreement Hub, then import the new file.
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                Tick <strong>Info only</strong> for sections that need no agreement (background,
                next steps). They are shown to the client but not counted.
              </p>
              <ul className="max-h-[28rem] divide-y divide-zinc-100 overflow-y-auto text-sm dark:divide-zinc-800">
                {parsed.items.map((item, i) => {
                  const match = plan?.matches[i];
                  const prevGroup = i > 0 ? parsed.items[i - 1].group : undefined;
                  return (
                    <li key={`${item.kind}:${item.key}`} className="py-2">
                      {item.group && item.group !== prevGroup && (
                        <p className="mb-1 text-xs font-semibold text-zinc-500">{item.group}</p>
                      )}
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 rounded px-1.5 text-xs font-medium ${
                            item.kind === "question"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {item.kind === "question" ? item.key : "Section"}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {item.kind === "question" ? stripMd(item.body) : item.title}
                        </span>
                        {match && (
                          <span
                            className={`shrink-0 rounded px-1.5 text-xs ${CHANGE_STYLE[match.change]}`}
                          >
                            {match.change}
                          </span>
                        )}
                        {item.kind === "section" && (
                          <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                            <input
                              type="checkbox"
                              name="info"
                              value={item.key}
                              defaultChecked={match?.existing?.infoOnly ?? item.infoOnly}
                            />
                            Info only
                          </label>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {plan && plan.removed.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium">
                    Not in this file (will be deleted with its responses):
                  </p>
                  <ul className="list-inside list-disc text-zinc-600 dark:text-zinc-400">
                    {plan.removed.map((e) => (
                      <li key={e.id}>{e.kind === "question" ? `${e.key}: ${stripMd(e.body)}` : e.title}</li>
                    ))}
                  </ul>
                </div>
              )}
              {plan && (
                <p className="text-xs text-zinc-500">
                  Changed items get a new version and need the client&apos;s response again.
                  Unchanged items keep their agreement. Only the current and previous versions
                  are kept: download the conversation record first if you need older messages.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {saveError && (
        <p className="text-sm text-red-600">
          Couldn&apos;t download the conversation record, so nothing was changed. Please try again.
        </p>
      )}

      {parsed && parsed.items.length > 0 && (
        <div className="space-y-1">
          <SubmitButton>{saving ? "Saving the record…" : submitLabel}</SubmitButton>
          {saveFirst && (
            <p className="text-xs text-zinc-500">
              Downloads the conversation record first. Keep it in your project&apos;s
              agreement-hub/ folder.
            </p>
          )}
        </div>
      )}
    </form>
  );
}


function stripMd(text: string) {
  return text.replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
}
