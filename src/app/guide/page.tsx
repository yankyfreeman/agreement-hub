import type { Metadata } from "next";
import Link from "next/link";
import { SkillCard } from "@/components/skill-card";
import { CopyText } from "@/components/ui";

export const metadata: Metadata = { title: "Write your scope · Agreement Hub" };

const AI_PROMPT = `Write the agreed project scope as a Markdown document that I will share with my client for review. Follow this format exactly, because a tool imports it automatically:

- Start with one "# " heading: the document title.
- Under the title, add short metadata lines (version, date, status) and nothing else.
- Use numbered "## " headings for the main sections, e.g. "## 4. Worker App".
- If a section has parts the client should agree to separately, use numbered "### " subheadings, e.g. "### 4.1 Sign-in". Each "##" or "###" heading with text under it becomes one item the client agrees or disagrees with, so keep each one focused on a single topic.
- Write plainly for a non-technical client. Bullet lists, numbered steps, tables, bold text and "> " notes are fine.
- Put every question for the client in a "## Questions for you" section as a bullet list. Each question starts with a bold number: "- **Q1.** Question text". Number them Q1, Q2, Q3… in order and never reuse a number.
- You may group questions under a bold line on its own, e.g. "**Billing**", directly above that group's list.
- When a section depends on an answer, refer to it as "see Q3".
- When updating the document later, keep the same section headings and question numbers for items that still exist, so earlier agreements carry over. Add new questions with new numbers; remove answered questions rather than renumbering the rest.`;

const EXAMPLE = `# Booking App: Project Scope

**Version:** 0.1 (draft for client review)
**Date:** 19 October 2026

## 1. What we are building
A booking website for the salon...

## 2. Customer Website

### 2.1 Booking
- Customers pick a service, stylist and time (see Q2)
- A confirmation email is sent

### 2.2 Payments
- A 20% deposit is taken by card

## 3. Questions for you

**Booking**
- **Q1.** Can customers book more than one service at a time?
- **Q2.** How far ahead can customers book?

**Payments**
- **Q3.** Is the deposit refundable?`;

const RULES: [string, string][] = [
  ["# Title", "The document title (first one only)."],
  ["Text before the first ##", "The introduction: version, date, status."],
  ["## 2. Section", "One section the client agrees or disagrees with."],
  ["### 2.1 Sub-section", "Its own section, grouped under the ## heading above it."],
  ["- **Q1.** Question?", "A question with its own answer box. Also works as a plain line without the bullet."],
  ["**Billing** (bold line alone)", "A group label for the questions directly below it."],
  ["see Q3", "Becomes a link to question Q3."],
  ["---", "Ignored."],
];

export default function GuidePage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12">
      <nav>
        <Link href="/" className="text-sm font-semibold">
          ← Agreement Hub
        </Link>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Write your scope document</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Agreement Hub turns your scope document into sections the client agrees to and
          questions the client answers. You focus on the project; the skill takes care of the
          rest.
        </p>
      </header>

      <SkillCard />

      <header id="without-claude" className="scroll-mt-6 space-y-2 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Not using Claude?</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Give another AI assistant our prompt, or write the Markdown yourself using the rules
          below.
        </p>
      </header>

      <section id="prompt" className="scroll-mt-6 space-y-3">
        <h3 className="font-semibold">Prompt for any AI assistant</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Paste this at the end of your scope conversation with ChatGPT or any other assistant.
        </p>
        <CopyText text={AI_PROMPT} label="Copy prompt" />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Format rules</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {RULES.map(([md, meaning]) => (
                <tr key={md}>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <code className="text-xs">{md}</code>
                  </td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A <code>##</code> heading with no text of its own (only <code>###</code> sub-sections)
          is used as a group heading, not a section. In the import preview you can mark sections
          like &quot;Why this document exists&quot; or &quot;Next steps&quot; as{" "}
          <strong>Info only</strong>, so they don&apos;t need agreement.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Updating a document</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          After the client responds, update the Markdown and use{" "}
          <strong>Import an updated Markdown version</strong> on the developer page. Sections are
          matched by heading text, then by number; questions by their Q number. Changed items get
          a new version and need the client&apos;s response again. Unchanged items keep their
          agreement. Items no longer in the file are archived, with their history kept.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Minimal example</h3>
        <CopyText text={EXAMPLE} label="Copy example" />
      </section>
    </main>
  );
}
