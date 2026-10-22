# Agreement Hub: project notes

Everything decided and built so far, and why. Last updated 22 October 2026.

Live site: https://agreement-hub.vercel.app
Repository: https://github.com/yankyfreeman/agreement-hub (deploys to Vercel on every push to `main`)

## Contents

1. [What Agreement Hub is](#1-what-agreement-hub-is)
2. [Who it is for](#2-who-it-is-for)
3. [How a developer uses it](#3-how-a-developer-uses-it)
4. [The scope document format](#4-the-scope-document-format)
5. [The Claude skill](#5-the-claude-skill)
6. [The MCP server (Claude connector)](#6-the-mcp-server-claude-connector)
7. [Access and keys: no accounts](#7-access-and-keys-no-accounts)
8. [Rate limits](#8-rate-limits)
9. [What the portal stores, and for how long](#9-what-the-portal-stores-and-for-how-long)
10. [Document versions](#10-document-versions)
11. [History in the developer's project: `docs/scope/`](#11-history-in-the-developers-project-docsscope)
12. [The website](#12-the-website)
13. [Data model](#13-data-model)
14. [Code map](#14-code-map)
15. [Ideas considered and not taken](#15-ideas-considered-and-not-taken)
16. [Timeline](#16-timeline)
17. [Setup notes](#17-setup-notes)
18. [Open items and possible next steps](#18-open-items-and-possible-next-steps)

---

## 1. What Agreement Hub is

A tool that keeps a client and a developer on the same page while planning a
project. The developer publishes a scope (functionality) document; the client
reads it at a private link and responds under each part:

- **Sections**: the client agrees, disagrees, asks a question or comments.
- **Questions** (Q1, Q2…): the client answers in a box under each one.

The developer replies in the same threads, asks for more detail on answers, and
publishes updated versions. Changed sections go back to the client for review;
unchanged ones keep their agreement.

## 2. Who it is for

The primary user is a **developer working with an AI assistant** (Claude in the
Claude app, Claude Code, or a code editor). The goal is to take the planning
burden between client and developer off the developer: they talk about the
project, and the AI writes, publishes, follows up and keeps the history.

The website still works on its own (import, reply, download), but it is not the
focus.

## 3. How a developer uses it

**With Claude, the skill and the connector (the main path):**

1. Install the skill once (download from the home page) and add the connector
   (`https://agreement-hub.vercel.app/api/mcp`).
2. Plan the project with Claude and say "make a scope document for the client".
   Claude writes it in the right format.
3. "Publish it to Agreement Hub." Claude creates the document and returns the
   private **developer link** and the **client link**, and saves the first
   snapshot in the project's `docs/scope/` folder.
4. The developer sends the client link. The client responds on the website.
5. "What did the client say?" Claude summarises disagreements, questions and
   answers. "Reply to Q2…" Claude replies.
6. "Update section 4 and send it." Claude saves a snapshot, edits the document,
   previews the change, applies it after the developer confirms, and saves the
   new snapshot. Each save is committed with git.

**With the website only:** import a Markdown file on the home page, copy the
client link, reply on the developer page, import updated versions, and use the
download buttons to keep copies.

## 4. The scope document format

Markdown, parsed by `src/lib/markdown-import.ts` (the same code runs in the
browser preview and on the server).

| Markdown | Becomes |
|---|---|
| `# Title` | Document title (only the first `#`) |
| Text before the first `##` | Introduction |
| `## 2. Section` | A section the client agrees to (a `##` with only `###` under it is a group heading) |
| `### 2.1 Part` | A section, grouped under its `##` |
| `- **Q1.** Question?` | A question with an answer box |
| `**Billing**` on its own line | Group label for the questions below it |
| `see Q3` | Link to question Q3 |
| `**Agreement Hub version:** 3 · **Saved:** …` under the title | Ignored on import (written by exports) |

Rules worth knowing:

- A section that **contains questions becomes info only** (the client can't
  agree to it), so questions belong in one "Questions for you" section.
- Agreement Hub keeps every line break, so paragraphs and list items should be
  written on one line each.
- **Re-importing:** sections match by heading text ignoring the number, then by
  number; questions match by Q number. Changed items get a new version and need
  the client's response again. A number-only change (4.5 → 4.6) counts as
  unchanged. Items missing from the new file are **deleted** with their
  responses.
- **Info only** is a flag set in the import preview (or `info_only` over MCP),
  not part of the Markdown. Re-imports keep each item's existing setting.

### Export

`toMarkdown` writes a document back out as Markdown that parses to the same
items, so the current state (including edits made on the website) can be
edited and re-imported with nothing changing by accident. A round-trip test
(parse → export → parse → plan) shows zero changes for the example documents.

## 5. The Claude skill

`skill/agreement-hub-scope/` (`SKILL.md` and `example.md`), served for download
as `public/agreement-hub-scope.zip`. It is the main way developers write scope
documents; the portal leads with it.

What it does:

- Writes scope documents in the import format from a conversation, notes or an
  existing document (keeping that document's content, changing only the
  structure). The developer never has to learn the format.
- Updates documents after client feedback without losing agreements (keeps
  headings word for word, keeps question numbers, removes answered questions).
- With the connector: publishes, checks responses, replies, and applies updates
  with a preview first.
- Keeps the history in the project's `docs/scope/` folder (section 11).

Installing:

- **Claude app:** Customize → Skills → + → Create skill → Upload a skill, then
  choose the ZIP. Needs "Code execution and file creation" on in Settings →
  Capabilities.
- **Claude Code:** unzip into `~/.claude/skills/`.

Rebuild the ZIP after editing the skill, from the `skill` folder (Windows
PowerShell's `Compress-Archive` writes `\` paths that some tools reject):

```bash
tar -a -cf ../public/agreement-hub-scope.zip agreement-hub-scope
```

When the parser changes, update `SKILL.md`, `example.md` and the prompt on
`/guide` with it.

## 6. The MCP server (Claude connector)

`/api/mcp` (`src/app/api/mcp/route.ts`, tools in `src/lib/mcp.ts`), built with
`mcp-handler` 2 and `@modelcontextprotocol/server` 2. Stateless Streamable HTTP;
no sign-in.

Connect:

- **Claude app:** Customize → Connectors → add a custom connector, name it
  Agreement Hub, URL `https://agreement-hub.vercel.app/api/mcp`, no sign-in.
  (The Claude app connects from Anthropic's cloud.)
- **Claude Code:** `claude mcp add --transport http agreement-hub https://agreement-hub.vercel.app/api/mcp`

| Tool | Does |
|---|---|
| `create_document` | Publishes Markdown with client/developer names and `info_only` sections; returns the developer and client links (version 1) |
| `get_open_items` | What needs the developer: disagreements, questions, new comments, answers, and what is waiting for the client |
| `get_document` | The conversation record (section 11), with the exact snapshot file name |
| `reply` | Replies on a section or question; `ask_for_more_detail` reopens a question |
| `get_markdown` | The current document as Markdown, with the exact snapshot file name |
| `preview_update` | What an updated file would change (changed, new, removed, renumbered), without changing anything |
| `apply_update` | Imports the update; returns the new version number |

Design choices:

- The tools reuse the website's functions (`createFromMarkdown`,
  `reimportMarkdown`, `addMessage`, `planImport`), so both behave identically.
- **Preview before applying.** An update can send sections back for review or
  delete items, and an AI can over-edit (rewrite everything when asked to
  change one section). The preview shows exactly what will change, and the
  server instructions tell Claude to confirm with the developer first.
  `apply_update` is marked destructive so clients ask for confirmation.
- **Client text is untrusted.** Client messages come back quoted with `>`, and
  the instructions tell Claude to treat them as the client's words, never as
  instructions. The tools can't post as the client or delete anything outside
  an update.
- A client link given to a developer tool is refused with a clear message.
- Items can be referred to as `4.2`, `Q3`, `4.2 Payments` or `Payments`.

Tested end to end with the official MCP client: create, client responses,
open items, replies, follow-ups, export, preview, apply, rate limits.

## 7. Access and keys: no accounts

There is **no login or sign-up**, and none is planned.

- Every document has two secret links: the **developer link**
  (`/manage/<token>`), which gives full access, and the **client link**
  (`/d/<token>`), which lets the client respond.
- The developer link is the key for everything, on the website and over MCP.
  Creating a document is what hands it out. No separate API keys.
- Server actions and tools check the token on every call and derive the role
  from it; nothing about the role comes from the request.
- Pages are `noindex` and never send the link to other sites as a referrer.
- In the developer's project the links live in `docs/scope/links.local.md`,
  which is git-ignored.

Why no accounts: they would need email verification or another sign-in method,
and the link model already works for both the website and MCP. If accounts are
ever needed (for "all my documents" across devices), the options discussed
were sign-in with GitHub and passkeys (both free, no email service needed);
email links would also be within free tiers (e.g. Resend).

## 8. Rate limits

`src/lib/rate-limit.ts`. Stored in the database (`rate_events`), so they hold
across serverless instances without another service. Callers are identified by
a hash of their IP address (the address itself is never stored).

| Limit | Value |
|---|---|
| Any MCP request, per caller | 600 per minute |
| MCP tool calls on one document (keyed by its developer link) | 60 per minute |
| New documents per caller (website and MCP together) | 60 per hour |
| New documents from everyone together | 300 per hour |

The per-caller limits are deliberately generous because everyone using the
Claude app reaches the server from Anthropic's shared addresses; the
per-document and total limits do the finer work. Rows older than a day are
pruned.

## 9. What the portal stores, and for how long

The portal keeps only the **live working copy** the client link needs. The
full history lives in the developer's project (section 11).

- The **current and previous version** of each section and question, and the
  messages written about those two versions. Older versions and their messages
  are deleted as soon as a new version is created.
- The **last two** imported files ("Recent imports" on the developer page).
- Items an update removes are **deleted** with their responses (there is no
  "Removed in later versions" archive any more).

`pruneHistory` in `src/db/index.ts` runs after every import and section edit,
and once on every cold start (which cleaned up existing documents when this
went live on 22 October 2026). The old `archived_at` column is left in the
table, unused and empty, so a still-running older deployment can't break; it
can be dropped later.

**What happens when the client responds:** each agree, disagree, comment or
answer is stored immediately as one row in `messages`, tied to the version it
was about. It does not create a new version and nothing is deleted. Versions,
and pruning, happen only when the **developer** changes the text. That is why
the one required save point is right before an update.

## 10. Document versions

Each document has a version number (`documents.version`): **1** when published,
**+1** for every update that changes something (import, section edit, or a
title/introduction edit). Sending back an unchanged file does not create a
version.

Every exported file carries it under the title:

```
**Agreement Hub version:** 3 · **Saved:** 2026-10-22 14:30 UTC
```

The importer ignores that line, so it never ends up in the client's document.
The document page shows "version N" to both sides.

## 11. History in the developer's project: `docs/scope/`

The snapshots live **in the developer's own repo**, in `docs/scope/` at the
project root. Nothing in that folder is stored on the portal.

```
booking-app/                 the developer's project (their git repo)
  src/
  docs/
    scope/
      booking-app-scope-v1_2026-10-20_09-15.md
      booking-app-scope-v2_2026-10-21_16-40.md
      booking-app-record-v2_2026-10-22_14-28.md
      booking-app-scope-v3_2026-10-22_14-30.md
      links.local.md         secret links, git-ignored
```

- **Scope file** (`<prefix>-scope-v<version>_<date>_<time>.md`): the document,
  what is proposed to the client.
- **Record file** (`<prefix>-record-v<version>_<date>_<time>.md`): the
  conversation, every section's and question's status and every message, with
  who wrote it, when and on which version. No links, so it is safe to commit.
- **Version, date and time (UTC)** in the name match the line inside the file.
  `get_markdown`, `get_document` and the website downloads produce the same
  names.
- **Prefix** defaults to the project's name (`booking-app`). The developer can
  change it at any time; Claude renames every snapshot with `git mv`, changing
  only the prefix, never the version or time.
- Every save is a new file (nothing is overwritten), and each save point is
  committed, e.g. `Scope v3 (2026-10-22 14:30 UTC): email reminders, Q5 added`.

### Save points

| When | Save |
|---|---|
| After publishing | scope snapshot (version 1), links in `links.local.md` |
| **Right before every update** (required: older versions are deleted then) | record snapshot, plus a scope snapshot if none exists for the current version, then commit |
| Right after every update | scope snapshot of the new version, then commit |
| When checking the client's responses (optional) | record snapshot |

The portal can't verify that the developer saved a copy. The skill always saves
first; on the website, **Apply update** downloads the conversation record before
it sends the update (verified in the network log).

## 12. The website

- **Home page:** leads with the skill ("Write your scope with Claude",
  marked Recommended), then the connector ("Let Claude publish and manage
  it"), how it works, and the import form. The manual format is behind a small
  "Not using Claude?" link.
- **Guide (`/guide`, "Write your scope document"):** the skill first; under
  "Not using Claude?" the prompt for any AI assistant, the format rules,
  updating notes and an example.
- **Import form:** live preview of sections and questions, Info only ticks, and
  for updates a list of what will change and what will be deleted. If a file has
  no sections or questions, it suggests asking Claude with the skill to prepare
  it.
- **Document page (client and developer):**
  - Reads like a printed page; hover icons to respond (client) or reply and edit
    (developer); a thin coloured line in the margin shows each item's status.
  - **Contents sidebar** on wide screens: every section under its group, the
    question groups with answered counts ("0/2"), a status dot (green agreed,
    red disagreed, amber question), and the part being read highlighted. Click
    to jump. On phones it is a collapsible "Contents" box. Hidden when printing.
  - Header: names, version, last activity, and a status line ("3 of 7 sections
    agreed · 1 disagreed · 2 of 4 questions answered").
- **Developer page extras:** client link, "Keep a copy in your project" with
  **Document (.md)** and **Conversation record (.md)**, import an update,
  recent imports, edit details.
- "Print / save PDF" prints the full page, expanding conversations.

## 13. Data model

Postgres through Drizzle (`src/db/schema.ts`). Tables are created and updated
on first use by `SCHEMA_SQL`; there is no separate migration step.

| Table | Holds | New row when |
|---|---|---|
| `documents` | title, introduction, names, the two tokens, version | a document is created |
| `sections` | one row per section or question (kind, key, group, info only, position) | created, or added by an update |
| `section_versions` | the text of a section or question (max two kept) | the developer changes that item's text |
| `messages` | agree, disagree, question, comment, answer, reply, follow-up | immediately, on every response |
| `imports` | the last two imported Markdown files, with a change summary | each import |
| `rate_events` | rate-limit counters | each rate-limited call |

Production uses **Neon** via `DATABASE_URL`. Locally, without `DATABASE_URL`,
the app uses **PGlite**, an embedded Postgres stored in `.data/` (local test
data only; git-ignored; deleting it is harmless).

## 14. Code map

```
src/
  app/
    page.tsx                         home page
    guide/page.tsx                   "Write your scope document"
    manage/[token]/                  developer page
      imports/[id]/route.ts          download an imported file
      export/[kind]/route.ts         download the document or record snapshot
    d/[token]/                       client page
    api/mcp/route.ts                 MCP server (per-request handler, rate limit)
    actions.ts                       server actions (all writes; role from the token)
  components/
    document-view.tsx                document page, developer panel, contents data
    outline.tsx                      contents sidebar / box with scroll highlight
    section-card.tsx, questions-block.tsx, item-actions.tsx, questions-client.tsx
    import-form.tsx                  import with preview; saves the record before updates
    skill-card.tsx, connect-card.tsx home and guide boxes
  db/
    schema.ts                        tables and SCHEMA_SQL
    index.ts                         connection (Neon or PGlite), pruneHistory
  lib/
    data.ts                          queries, status, imports, versions, file names
    markdown-import.ts               parse, re-import planning, export
    mcp.ts                           MCP tools and server instructions
    record.ts                        conversation record export
    rate-limit.ts                    rate limits
skill/agreement-hub-scope/           the Claude skill
public/agreement-hub-scope.zip       the skill, as downloaded
```

Stack: Next.js 16 (App Router, Server Actions, Cache Components), TypeScript,
Tailwind CSS, Drizzle, mdast and react-markdown, Vercel. This Next.js version
differs from older ones; check `node_modules/next/dist/docs/` before relying on
remembered APIs.

## 15. Ideas considered and not taken

- **MCP as the format standard.** The Markdown format is the standard for the
  document; MCP is for the conversation after publishing (reading responses,
  replying, updating). Both kept, each for its own job.
- **Converting any Markdown on the server** (rules or AI) into our format.
  Rejected: the developer shouldn't upload "whatever" and have it rewritten.
  Instead the skill writes the right format from the start, and for existing
  documents Claude restructures them on the developer's side.
- **Login, sign-up and email verification.** Not needed; the developer link is
  the key (section 7).
- **Keeping full history on the portal.** Replaced by two versions on the
  portal and the full history in the developer's repo (sections 9 and 11).
- **Fixed file names overwritten on each save.** Replaced by one snapshot per
  save with the version, date and time in the name, plus git commits.
- **Folder name `agreement-hub/`.** Renamed to `docs/scope/` so it is clearly
  part of the developer's project, not the portal.

## 16. Timeline

| Date | Change |
|---|---|
| 19 Oct | Next.js scaffold, MVP, Markdown import, document shown as a readable page |
| 21 Oct | Claude skill added and offered on the home page and guide |
| 21 Oct | Skill made the primary path; manual format under "Not using Claude?" |
| 21 Oct | Contents sidebar on the document page; skill told not to hard-wrap lines |
| 21 Oct | MCP server with seven tools, rate limits, Markdown export, "Connect Claude" box |
| 21–22 Oct | Two versions on the portal, removed items deleted, conversation record, downloads |
| 22 Oct | Document versions, `docs/scope/` snapshots with version/date/time names, record saved before updates |
| 22 Oct | All of the above merged and live; existing documents trimmed to two versions |

Commits on `main`:

```
9793b6e Keep project snapshots in docs/scope/ instead of agreement-hub/
cdcbe0b Save project snapshots with the version, date and time in the file name
21c41b3 Version documents and keep their history in the project's agreement-hub/ folder
df30171 Keep the unused archived_at column so older deployments keep working
dad845b Keep only the latest two versions; the project keeps the history
65a7d5d Add an MCP server so Claude can publish and manage documents
014e153 Add a contents sidebar to the document page
c190983 Make the Claude skill the main way to write a scope document
22d9079 Add a Claude skill that writes scope documents in the import format
a3f2282 Present documents as a readable page instead of a form
0c2b45b Import scope documents from Markdown
777cf25 Build Agreement Hub MVP
d62a86c Initial Next.js scaffold for Agreement Hub
```

## 17. Setup notes

- The working copy is `C:\Users\xyzat\Documents\github\agreement-hub`, a git
  clone of `yankyfreeman/agreement-hub`. An older non-git copy,
  `agreement-hub-old`, sits next to it and can be deleted.
- Work goes on a branch; Vercel builds a preview for it (previews ask for a
  Vercel sign-in). Merging to `main` deploys to production.
- `npm run dev` runs locally on port 3000 with the PGlite database; no setup
  needed. `.claude/launch.json` holds the dev-server setting for the Claude
  app's preview pane (not committed).

## 18. Open items and possible next steps

- Drop the unused `sections.archived_at` column in a later release.
- Re-upload the skill in Claude whenever it changes (it was updated with the
  `docs/scope/` snapshots on 22 October).
- Email notifications when the other side responds (would need an email
  service; free tiers are enough at this size).
- A document list for developers would need accounts (GitHub sign-in or
  passkeys).
- Sign-off: both sides formally approve a final version.
