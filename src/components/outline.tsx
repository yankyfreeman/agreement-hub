"use client";

import { useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/data";

export type OutlineEntry = {
  /** Element id to jump to. */
  target: string;
  label: string;
  /** 0 = top level, 1 = indented under the entry above. */
  level: 0 | 1;
  status: Status | null;
  /** Small text after the label, e.g. "2/3" answered. */
  note?: string;
};

// Same colours as the line in the document's left margin.
const DOT: Partial<Record<Status, string>> = {
  agreed: "bg-emerald-500",
  answered: "bg-emerald-500",
  disagreed: "bg-red-500",
  question: "bg-amber-500",
  followup: "bg-amber-500",
};

// How far below the top of the window a heading counts as "being read".
const READING_LINE = 140;

/**
 * Contents of the document with links to each part. As a sidebar it stays in
 * view while scrolling and highlights the part being read.
 */
export function Outline({
  entries,
  variant,
}: {
  entries: OutlineEntry[];
  variant: "sidebar" | "inline";
}) {
  const { active, pin } = useActiveTarget(variant === "sidebar" ? entries : null);
  const list = (
    <ol className="space-y-px font-sans text-sm">
      {entries.map((e) => (
        <li key={e.target}>
          <a
            href={`#${e.target}`}
            onClick={() => pin(e.target)}
            title={e.label}
            aria-current={e.target === active ? "location" : undefined}
            className={`flex items-center gap-2 rounded-md py-1 pr-2 ${e.level ? "pl-5" : "pl-2"} ${
              e.target === active
                ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
                : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
            }`}
          >
            <span className="min-w-0 flex-1 truncate">{e.label}</span>
            {e.note && <span className="shrink-0 text-xs tabular-nums text-zinc-400">{e.note}</span>}
            {e.status && DOT[e.status] && (
              <span className={`size-1.5 shrink-0 rounded-full ${DOT[e.status]}`} aria-hidden />
            )}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === "inline") {
    return (
      <details className="rounded-lg border border-zinc-200 bg-white p-3 lg:hidden print:hidden dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer font-sans text-sm font-medium">Contents</summary>
        <nav aria-label="Contents" className="mt-2">
          {list}
        </nav>
      </details>
    );
  }
  return (
    <nav
      aria-label="Contents"
      className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pb-4"
    >
      <p className="mb-2 px-2 font-sans text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Contents
      </p>
      {list}
    </nav>
  );
}

/**
 * The last entry whose element has scrolled up past the reading line. A
 * clicked entry stays active while it is on screen, since entries near the end
 * of the page can't scroll up to the reading line.
 */
function useActiveTarget(entries: OutlineEntry[] | null) {
  const [active, setActive] = useState<string | null>(null);
  const pinned = useRef<string | null>(null);

  useEffect(() => {
    if (!entries) return;
    const elements = entries
      .map((e) => document.getElementById(e.target))
      .filter((el): el is HTMLElement => el !== null);
    let frame = 0;
    const update = () => {
      frame = 0;
      const pin = pinned.current && document.getElementById(pinned.current);
      if (pin) {
        const { top } = pin.getBoundingClientRect();
        if (top >= 0 && top < window.innerHeight) return setActive(pin.id);
      }
      let current: string | null = null;
      for (const el of elements) {
        if (el.getBoundingClientRect().top > READING_LINE) break;
        current = el.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Scrolling by hand releases a clicked entry.
    const unpin = () => {
      pinned.current = null;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", unpin, { passive: true });
    window.addEventListener("touchmove", unpin, { passive: true });
    window.addEventListener("keydown", unpin);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", unpin);
      window.removeEventListener("touchmove", unpin);
      window.removeEventListener("keydown", unpin);
    };
  }, [entries]);

  const pin = (target: string) => {
    pinned.current = target;
    setActive(target);
  };
  return { active, pin };
}
