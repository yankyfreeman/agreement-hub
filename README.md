# Agreement Hub

A simple web app that keeps a client and a developer on the same page.

The developer publishes a functionality / scope document at a shareable URL.
The client reads it and responds right under each section: agree, disagree,
or ask a question. Agreement Hub holds the latest state; the developer's project
holds the full history of the document and the conversation.

## How it works

1. **Write the scope with Claude** using the Agreement Hub skill (`skill/`, downloadable
   from the home page). It writes the document in the import format, so developers never
   need to learn it. For other AI assistants, `/guide` has a prompt and the format rules.
2. **Import it** on the home page. A preview shows what becomes a section and what
   becomes a question; tick **Info only** on sections that need no agreement.
   You land on the developer page (`/manage/<secret>`). Bookmark it: it is the
   only way back in.
3. **Copy the client link** (`/d/<secret>`) and send it to the client.
4. The **client responds**: *Agree*, *Question*, *Disagree* or *Comment* on each
   section, and answers all the questions in one form.
5. You **reply** in the same threads, or ask for more detail on a question.
6. **Import the next version** of the Markdown into the same document when the
   scope changes.
7. **Keep the history in your project**: download the document and its
   conversation record from the developer page after each update and commit
   them. The skill does this for you when Claude is connected.

### Connect Claude (MCP)

`/api/mcp` is an MCP server (Streamable HTTP, no sign-in) so a developer's AI
assistant can do all of the above without the website. Add it in the Claude app
under Customize → Connectors, or in Claude Code with
`claude mcp add --transport http agreement-hub https://<site>/api/mcp`.

| Tool | Does |
|---|---|
| `create_document` | Publishes Markdown; returns the developer and client links |
| `get_open_items` | What needs the developer: disagreements, questions, answers, what's waiting |
| `get_document` | The conversation record: every item's status and messages, to save in the project |
| `reply` | Replies on a section or question, or asks for more detail on a question |
| `get_markdown` | The current document as Markdown, ready to edit |
| `preview_update` / `apply_update` | Shows what an updated version would change, then imports it |
| `sync_specs` | Sends the project's spec lines (ID, scope section, text) for the Progress tab |
| `report_progress` | Records test results per spec line: passing, failing or not built |

### Specs and the Progress tab

Once the scope is agreed, the skill breaks it into feature specs in the
developer's project (`specs/<feature>/spec.md`, one testable line per
behaviour, each with a permanent ID such as `BC-2` and the scope section it
implements), then plans and tasks. `sync_specs` sends the lines to Agreement
Hub (`spec_checks` table, current status only) and `report_progress` sends
test results. Both links get **Scope** and **Progress** tabs (`?view=progress`;
clients see Progress once there are checks): each agreed section with its
checks, verified when their tests pass.

There are no accounts: every tool except `create_document` takes the document's
developer link, exactly like the website. Rate limits (`src/lib/rate-limit.ts`)
are stored in the database: per caller IP, per document, and on new documents
overall (shared with the website's import). Tools live in `src/lib/mcp.ts`.

### Markdown format

| Markdown | Becomes |
|---|---|
| `# Title` | Document title |
| Text before the first `##` | Introduction |
| `## 2. Section` | A section to agree on (a `##` with only `###` children is just a group heading) |
| `### 2.1 Sub-section` | A section, grouped under its `##` |
| `- **Q1.** Question?` | A question with an answer box |
| `**Billing**` on its own line | Group label for the questions below it |
| `see Q3` | Link to question Q3 |

Parsing lives in `src/lib/markdown-import.ts` and runs both in the browser
(preview) and on the server (import).

### Re-importing

- Sections match by heading text (ignoring its number), then by number;
  questions match by Q number.
- **Changed** items get a new version and need the client's response again.
- **Unchanged** items keep their agreement. A number-only change (4.5 → 4.6)
  counts as unchanged.
- Items **missing** from the new file are deleted, with their responses.
- The last two imported files can be downloaded from "Recent imports".

### What is kept

Agreement Hub keeps only what is needed to review the current state; the
developer's project keeps the history (`pruneHistory` in `src/db/index.ts`
runs after every change and on each cold start):

- The **current and previous version** of each section and question, and the
  messages written about them. Older versions and their messages are deleted.
- The **last two** imported files.
- On the developer page, **Document (.md)** and **Conversation record (.md)**
  download the current document and every item's status and messages
  (`src/lib/record.ts`; no links, so it is safe to commit). **Apply update**
  downloads the record before it changes anything.

Each document has a version number: 1 when published, +1 for every update
that changes it. Exports write it under the title as
`**Agreement Hub version:** 3 · **Saved:** 2026-10-22 14:30 UTC`; the importer
ignores that line.

In the developer's project the files live in `docs/scope/` at the root, one
snapshot per save, named `<prefix>-scope-v3_2026-10-22_14-30.md` (the
document) and `<prefix>-record-v3_2026-10-22_14-30.md` (the conversation
record), both committed, plus a git-ignored `links.local.md`. The time is UTC
and matches the line inside the file. The skill saves and commits snapshots
before and after every update; the developer can change the prefix at any
time, which renames the files but keeps their version and time.

Status is always about the **current** version of an item, and every message
shows who wrote it, when, and which version it was about.

There are no accounts. Access is by link only: whoever has the developer link
can edit, and whoever has the client link can respond. Pages are marked
`noindex` and never send the link to other sites as a referrer.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, TypeScript, Tailwind CSS)
- Markdown: [mdast](https://github.com/syntax-tree/mdast) for parsing, [react-markdown](https://github.com/remarkjs/react-markdown) + GFM for display
- [Drizzle ORM](https://orm.drizzle.team) on Postgres
  - Production: [Neon](https://neon.tech) via `DATABASE_URL`
  - Local: [PGlite](https://pglite.dev), an embedded Postgres stored in `.data/`, used
    automatically when `DATABASE_URL` is not set
- Hosting: [Vercel](https://vercel.com)

Tables are created automatically on first use (see `SCHEMA_SQL` in
`src/db/schema.ts`), so there is no separate migration step.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup is needed.

## Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the `agreement-hub` GitHub repo.
2. Before the first deploy (or right after), open the project's **Storage** tab,
   choose **Neon (Postgres)** from the Marketplace and connect it to the project.
   This sets `DATABASE_URL` for you.
3. Deploy (redeploy if you added the database after the first build).

Every push to `main` then deploys automatically.

## Project layout

```
src/
  app/
    page.tsx              home page + Markdown import
    guide/                format guide and AI prompt
    manage/[token]/       developer view (+ imports/[id] download)
    d/[token]/            client view
    actions.ts            server actions (all writes; role checked from the token)
    api/mcp/              MCP server for AI assistants (tools in lib/mcp.ts)
  components/             UI (document view, sections, questions, import form)
  db/                     Drizzle schema and connection
  lib/data.ts             queries, status logic, applying imports
  lib/markdown-import.ts  Markdown parsing, re-import matching and export
  lib/mcp.ts              MCP tools
  lib/rate-limit.ts       rate limits for imports and MCP
  lib/record.ts           the conversation record export
  components/progress-view.tsx   the Progress tab
docs/how-to.md            step-by-step guide for using Agreement Hub on a project
docs/project-notes.md     every decision so far and why
docs/spec-drift-and-changes.md   checklist for spec drift and client change requests
skill/                    Claude skill that writes scope documents in this format
public/agreement-hub-scope.zip   the skill, as served for download
```

## Possible next steps

- Email notifications when the other side responds
- Developer accounts (sign in instead of a secret link) and a document list
- Sign-off: both sides formally approve a final version
