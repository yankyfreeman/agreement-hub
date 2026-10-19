"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const style =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      : "border border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${style}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

/** Formats a timestamp in the viewer's own time zone. */
export function LocalTime({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}

export function CopyLink({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- origin is only known in the browser
  useEffect(() => setUrl(window.location.origin + path), [path]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {url}
      </code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 print:hidden dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      Print / save PDF
    </button>
  );
}

export function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-100 p-4 pr-24 text-xs leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        {text}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute right-2 top-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
