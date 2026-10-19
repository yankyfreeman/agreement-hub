# Agreement Hub

A simple web app that keeps a client and a developer on the same page.

The developer publishes a functionality / scope document at a shareable URL.
The client reads it and responds right under each section: agree, disagree,
or ask a question. Every response and reply is kept as a permanent record of
what was agreed, what was disputed, and how it was resolved.

## Core features (MVP)

- **Documents** – developer creates a document split into sections (features / requirements).
- **Share link** – each document gets a unique URL to send to the client.
- **Section responses** – client marks each section *Agreed*, *Disagreed* or *Question*, with a comment.
- **Threaded conversation** – developer and client reply under each section.
- **Status overview** – see at a glance which sections are agreed, open or disputed.
- **History** – nothing is deleted; edits to a section create a new version so the record stays intact.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS)
- Database: Postgres (Neon via the Vercel Marketplace) – planned
- Hosting: [Vercel](https://vercel.com)

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.
