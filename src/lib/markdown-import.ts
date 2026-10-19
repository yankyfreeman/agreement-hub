// Turns a scope document written in Markdown into reviewable items, and works
// out how a re-imported file maps onto a document's existing items.
// Pure functions only: this runs in the browser (import preview) and on the
// server (the actual import), so both always agree.

import type { List, ListItem, Paragraph, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { toString } from "mdast-util-to-string";
import { gfm } from "micromark-extension-gfm";

export type ItemKind = "section" | "question";

export type ParsedItem = {
  kind: ItemKind;
  /** Stable identifier used to match items across imports: "4.1", "Q3", or a slug. */
  key: string;
  title: string;
  /** Heading or bold label the item sits under, e.g. "4. Worker App" or "Billing". */
  group: string | null;
  body: string;
  infoOnly: boolean;
};

export type ParsedDocument = {
  title: string;
  intro: string;
  items: ParsedItem[];
};

const QUESTION_LABEL = /^Q(\d+)\.?$/i;
// "4.1 Platform", "6. Admin Panel", "10) Next steps"
const NUMBERED_HEADING = /^(\d+(?:\.\d+)*)[.)]?\s+/;

export function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function headingKey(title: string) {
  return title.match(NUMBERED_HEADING)?.[1] ?? slug(title);
}

/** Returns "Q3" if the paragraph starts with a bold **Q3.** label. */
function questionLabel(p: Paragraph | undefined): string | null {
  const first = p?.children[0];
  if (first?.type !== "strong") return null;
  const m = toString(first).trim().match(QUESTION_LABEL);
  return m ? `Q${m[1]}` : null;
}

function isBoldOnly(node: RootContent) {
  return (
    node.type === "paragraph" && node.children.length === 1 && node.children[0].type === "strong"
  );
}

export function parseMarkdown(source: string): ParsedDocument {
  const text = source.replace(/\r\n?/g, "\n");
  const tree = fromMarkdown(text, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const raw = (node: { position?: { start: { offset?: number }; end: { offset?: number } } }) =>
    text.slice(node.position?.start.offset ?? 0, node.position?.end.offset ?? 0);

  let title = "";
  const introBlocks: string[] = [];
  const items: ParsedItem[] = [];

  // Current place in the outline while walking top-level blocks.
  let h2: string | null = null;
  let current: {
    title: string;
    group: string | null;
    blocks: string[];
    hadQuestions: boolean;
    index: number; // where the section goes, ahead of any questions it contains
  } | null = null;
  let questionGroup: string | null = null;
  let pendingLabel: string | null = null;

  const flushLabel = () => {
    if (pendingLabel !== null) current?.blocks.push(`**${pendingLabel}**`);
    pendingLabel = null;
  };

  const closeSection = () => {
    flushLabel();
    if (current) {
      const body = current.blocks.join("\n\n").trim();
      // Headings with no text of their own (like "4. Worker App" above its
      // subsections) are only group labels. A heading that holds questions
      // keeps its intro text as an info-only section.
      if (body) {
        items.splice(current.index, 0, {
          kind: "section",
          key: headingKey(current.title),
          title: current.title,
          group: current.group,
          body,
          infoOnly: current.hadQuestions,
        });
      }
    }
    current = null;
    questionGroup = null;
  };

  const addQuestion = (key: string, body: string) => {
    if (current) current.hadQuestions = true;
    items.push({
      kind: "question",
      key,
      title: key,
      group: questionGroup ?? current?.title ?? h2,
      body: body.trim(),
      infoOnly: false,
    });
  };

  // Strips the list marker and the **Qn.** label from a question's raw text.
  const questionBody = (rawText: string) =>
    rawText
      .replace(/^\s*(?:[-*+]|\d+[.)])?\s*\*\*\s*Q\d+\.?\s*\*\*\s*/i, "")
      .replace(/\n {2,4}/g, "\n");

  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 1 && !title) {
      title = toString(node).trim();
      continue;
    }
    if (node.type === "thematicBreak") continue;

    if (node.type === "heading" && node.depth <= 3) {
      closeSection();
      const headingText = toString(node).trim();
      if (node.depth <= 2) {
        h2 = headingText;
        current = { title: headingText, group: null, blocks: [], hadQuestions: false, index: items.length };
      } else {
        current = { title: headingText, group: h2, blocks: [], hadQuestions: false, index: items.length };
      }
      continue;
    }

    if (!current) {
      introBlocks.push(raw(node));
      continue;
    }

    // A bold-only line ("**Billing**") may label the questions that follow.
    if (isBoldOnly(node)) {
      flushLabel();
      pendingLabel = toString(node).trim();
      continue;
    }

    if (node.type === "list" && (node as List).children.some((li) => questionLabel(firstPara(li)))) {
      if (pendingLabel !== null) questionGroup = pendingLabel;
      pendingLabel = null;
      const others: string[] = [];
      for (const li of node.children) {
        const key = questionLabel(firstPara(li));
        if (key) addQuestion(key, questionBody(raw(li)));
        else others.push(raw(li));
      }
      if (others.length) current.blocks.push(others.join("\n"));
      continue;
    }

    if (node.type === "paragraph" && questionLabel(node)) {
      if (pendingLabel !== null) questionGroup = pendingLabel;
      pendingLabel = null;
      addQuestion(questionLabel(node)!, questionBody(raw(node)));
      continue;
    }

    flushLabel();
    current.blocks.push(raw(node));
  }
  closeSection();

  // Section numbers must be unique to match reliably; fall back to the slug.
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(`${item.kind}:${item.key}`)) item.key = `${item.key}-${slug(item.title)}`;
    seen.add(`${item.kind}:${item.key}`);
  }

  return { title, intro: introBlocks.join("\n\n").trim(), items };
}

function firstPara(li: ListItem): Paragraph | undefined {
  const first = li.children[0];
  return first?.type === "paragraph" ? first : undefined;
}

// ---------------------------------------------------------------------------
// Re-import planning

export type ExistingItem = {
  id: number;
  kind: ItemKind;
  key: string;
  title: string;
  body: string;
  infoOnly: boolean;
  archived: boolean;
};

export type Change = "new" | "changed" | "unchanged" | "restored";

export type ImportPlan = {
  matches: {
    item: ParsedItem;
    existing: ExistingItem | null;
    change: Change;
    /** Only the heading number changed (e.g. 4.5 → 4.6); content is the same. */
    renumbered: boolean;
  }[];
  removed: ExistingItem[];
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
// Heading text without its number, so a renumbered section still matches.
const bare = (title: string) => norm(title.replace(NUMBERED_HEADING, ""));

/**
 * Pairs each parsed item with an existing one. Sections match by heading text
 * ignoring its number (so inserting a section and renumbering the rest keeps
 * their history), then by number; questions match by number (Q3 stays Q3 even
 * if its wording is refined).
 */
export function planImport(existing: ExistingItem[], parsed: ParsedItem[]): ImportPlan {
  const pool = new Set(existing);
  const take = (pred: (e: ExistingItem) => boolean) => {
    for (const e of pool) {
      if (pred(e)) {
        pool.delete(e);
        return e;
      }
    }
    return null;
  };

  // Pass 1 matches every exact heading / question number before pass 2 falls
  // back to section numbers, so a renumbered section isn't claimed by a new
  // section that took over its old number.
  const found = parsed.map((item) =>
    item.kind === "section"
      ? take((e) => e.kind === "section" && bare(e.title) === bare(item.title))
      : take((e) => e.kind === "question" && e.key === item.key),
  );
  parsed.forEach((item, i) => {
    if (!found[i] && item.kind === "section") {
      found[i] = take((e) => e.kind === "section" && e.key === item.key);
    }
  });

  const matches = parsed.map((item, i) => {
    const match = found[i];
    let change: Change = "new";
    let renumbered = false;
    if (match) {
      const same = bare(match.title) === bare(item.title) && match.body.trim() === item.body.trim();
      change = !same ? "changed" : match.archived ? "restored" : "unchanged";
      renumbered = same && norm(match.title) !== norm(item.title);
    }
    return { item, existing: match, change, renumbered };
  });

  return { matches, removed: [...pool].filter((e) => !e.archived) };
}

/** e.g. "3 new, 5 changed, 1 removed, 20 unchanged" */
export function summarizePlan(plan: ImportPlan) {
  const count = (c: Change) => plan.matches.filter((m) => m.change === c).length;
  return (
    [
      [count("new"), "new"],
      [count("changed"), "changed"],
      [count("restored"), "restored"],
      [plan.removed.length, "removed"],
      [count("unchanged"), "unchanged"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(", ");
}
