# Agreement Hub

A simple web app that keeps a client and a developer on the same page.

The developer publishes a functionality / scope document at a shareable URL.
The client reads it and responds right under each section: agree, disagree,
or ask a question. Every response and reply is kept as a permanent record of
what was agreed, what was disputed, and how it was resolved.

## How it works

1. **Create a document** on the home page. You land on the developer page
   (`/manage/<secret>`). Bookmark it: it is the only way back in.
2. **Add sections**, one feature or requirement each.
3. **Copy the client link** (`/d/<secret>`) and send it to the client.
4. The **client responds** under each section: *Agree*, *Question*, *Disagree* or *Comment*.
5. You **reply** in the same thread, or **edit** the section.

Rules that keep the record honest:

- Nothing is deleted. Editing a section saves a new version; old versions stay
  visible under "Previous versions".
- A section's status is the client's latest stance on the **current** version.
  Editing a section resets it to "Awaiting client" until they respond again.
- Every message shows who wrote it, when, and which version it was about.
- "Print / save PDF" produces a clean copy of the full record.

There are no accounts. Access is by link only: whoever has the developer link
can edit, and whoever has the client link can respond. Pages are marked
`noindex` and send no referrer, so the links don't leak through search engines.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, TypeScript, Tailwind CSS)
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
    page.tsx              home page + "new document" form
    manage/[token]/       developer view
    d/[token]/            client view
    actions.ts            server actions (all writes; role checked from the token)
  components/             UI (document view, section card, status summary)
  db/                     Drizzle schema and connection
  lib/data.ts             queries and status logic
```

## Possible next steps

- Email notifications when the other side responds
- Developer accounts (sign in instead of a secret link) and a document list
- Reordering and archiving sections
- Markdown formatting in section text
