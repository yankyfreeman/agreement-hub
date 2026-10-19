# Agreement Hub

A simple web app that keeps a client and a developer on the same page.

The developer publishes a functionality / scope document at a shareable URL.
The client reads it and responds right under each section: agree, disagree,
or ask a question. Every response and reply is kept as a permanent record of
what was agreed, what was disputed, and how it was resolved.

## How it works

1. **Write the scope with AI** and save it as a Markdown file. The format guide (`/guide`)
   in the app has a prompt you can paste into your AI conversation.
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
- Items **missing** from the new file are archived under "Removed in later
  versions", with their responses.
- Every imported file is stored and can be downloaded from "Import history".

Rules that keep the record honest:

- Nothing is deleted. Changes create new versions; old versions stay visible
  under "Previous versions".
- Status is always about the **current** version of an item.
- Every message shows who wrote it, when, and which version it was about.
- "Print / save PDF" produces a clean copy of the full record.

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
  components/             UI (document view, sections, questions, import form)
  db/                     Drizzle schema and connection
  lib/data.ts             queries, status logic, applying imports
  lib/markdown-import.ts  Markdown parsing and re-import matching
```

## Possible next steps

- Email notifications when the other side responds
- Developer accounts (sign in instead of a secret link) and a document list
- Sign-off: both sides formally approve a final version
