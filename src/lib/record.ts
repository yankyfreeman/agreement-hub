// The document's conversation as Markdown: every item's status and every
// message, with who wrote it, when, and on which version. Agreement Hub keeps
// only the current and previous versions, so developers save this file in
// their project. It contains no links, so it is safe to commit.

import type { DocumentView, Message, SectionView, Status } from "./data";

export const STATUS_LABEL: Record<Status, string> = {
  pending: "waiting for the client",
  agreed: "agreed",
  disagreed: "disagreed",
  question: "client asked a question",
  info: "info only, no agreement needed",
  unanswered: "not answered yet",
  answered: "answered",
  followup: "developer asked for more detail",
};

const CLIENT_VERB: Record<Message["kind"], string> = {
  agree: "agreed",
  disagree: "disagreed",
  question: "asked a question",
  comment: "commented",
  answer: "answered",
  followup: "asked for more detail",
};

export const when = (d: Date) => `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;

/** Quoted, so it reads as someone's words rather than part of the record's structure. */
export const quote = (body: string) =>
  body
    .split("\n")
    .map((line) => `    > ${line}`)
    .join("\n");

export function messageLine(m: Message, currentVersion: number) {
  const who = m.role === "client" ? `Client (${m.authorName})` : `Developer (${m.authorName})`;
  const verb =
    m.role === "client" ? CLIENT_VERB[m.kind] : m.kind === "followup" ? "asked for more detail" : "replied";
  const earlier = m.version !== currentVersion ? ` on earlier version ${m.version}` : "";
  return `- ${when(m.createdAt)} · ${who} ${verb}${earlier}${m.body ? `:\n${quote(m.body)}` : ""}`;
}

export const label = (s: SectionView) =>
  s.kind === "section" ? `[${s.key}] ${s.current.title}` : `[${s.key}] ${s.current.body.split("\n")[0]}`;

/** "3 of 7 sections agreed · 1 disagreed · 2 of 4 questions answered" */
export function statusSummary(items: SectionView[]) {
  const reviewable = items.filter((s) => s.kind === "section" && !s.infoOnly);
  const questions = items.filter((s) => s.kind === "question");
  const n = (list: SectionView[], status: Status) => list.filter((s) => s.status === status).length;
  return [
    reviewable.length && `${n(reviewable, "agreed")} of ${reviewable.length} sections agreed`,
    n(reviewable, "disagreed") && `${n(reviewable, "disagreed")} disagreed`,
    n(reviewable, "question") && `${n(reviewable, "question")} with questions`,
    questions.length && `${n(questions, "answered")} of ${questions.length} questions answered`,
    n(questions, "followup") && `${n(questions, "followup")} waiting for more detail`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function describeItem(s: SectionView, includeText: boolean) {
  const lines = [`### ${label(s)} (${STATUS_LABEL[s.status]}, version ${s.current.version})`];
  if (s.group) lines.push(`Group: ${s.group}`);
  // A question's first line is already in the heading.
  const body = s.kind === "question" ? s.current.body.split("\n").slice(1).join("\n") : s.current.body;
  if (includeText && body) lines.push(body);
  if (s.messages.length) {
    lines.push("Conversation:", ...s.messages.map((m) => messageLine(m, s.current.version)));
  }
  return lines.join("\n");
}

export function documentRecord(view: DocumentView, { includeText = true } = {}) {
  const { document: doc, sections } = view;
  return [
    `# ${doc.title}: conversation record`,
    `**Agreement Hub version:** ${doc.version} · **Saved:** ${when(new Date())}`,
    `Client: ${doc.clientName} · Developer: ${doc.developerName}`,
    `Status: ${statusSummary(sections) || "nothing to review yet"}`,
    "Agreement Hub keeps only the current and previous version of each item, with the messages about them. Keep this file in the project next to the scope document, and save it again after each update.",
    includeText && doc.intro ? doc.intro : "",
    ...sections.map((s) => describeItem(s, includeText)),
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}
