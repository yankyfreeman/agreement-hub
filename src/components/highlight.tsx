"use client";

import { createContext, useContext, useState } from "react";

const HighlightContext = createContext<{ on: boolean; toggle: () => void } | null>(null);

/**
 * Wraps the document. When highlighting is on it sets data-highlight="agreed",
 * and agreed sections tint themselves through a `group-data-[highlight=agreed]/doc:`
 * class, so the sections stay server-rendered.
 */
export function HighlightArea({ className, children }: { className: string; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <HighlightContext value={{ on, toggle: () => setOn((v) => !v) }}>
      <article data-highlight={on ? "agreed" : undefined} className={`group/doc ${className}`}>
        {children}
      </article>
    </HighlightContext>
  );
}

/** Turns the highlight of agreed sections on and off. */
export function HighlightButton({ count }: { count: number }) {
  const ctx = useContext(HighlightContext);
  if (!ctx || !count) return null;
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-pressed={ctx.on}
      className={`shrink-0 rounded-md border px-2.5 py-1 font-sans text-xs font-medium transition print:hidden ${
        ctx.on
          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
          : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }`}
    >
      {ctx.on ? "Hide highlight" : `Highlight agreed (${count})`}
    </button>
  );
}
