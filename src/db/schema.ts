import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  intro: text("intro").notNull().default(""),
  clientName: text("client_name").notNull(),
  developerName: text("developer_name").notNull(),
  // Link the client opens to review and respond.
  shareToken: text("share_token").notNull().unique(),
  // Link the developer keeps to manage the document. Never shown to the client.
  adminToken: text("admin_token").notNull().unique(),
  // 1 when published, +1 for every update that changes the document. Exports
  // write it into the file so the developer's project can track it.
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ItemKind = "section" | "question";

// A reviewable item: either a section of the scope (agree / disagree) or a
// question for the client (answer).
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  kind: text("kind").$type<ItemKind>().notNull().default("section"),
  // Matches items across Markdown imports: "4.1", "Q3", or a slug of the title.
  key: text("key").notNull().default(""),
  groupLabel: text("group_label"),
  // Shown for context only; no agreement needed and excluded from the status.
  infoOnly: boolean("info_only").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sections are not edited in place: every change adds a new version, so each
// response shows which text it was made against. Only the current and previous
// versions are kept (see pruneHistory); the developer's project keeps the rest.
export const sectionVersions = pgTable(
  "section_versions",
  {
    id: serial("id").primaryKey(),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sectionId, t.version)],
);

export type Role = "client" | "developer";
// Client on a section: agree / disagree / question / comment. Client on a
// question: answer. Developer: comment, or followup to reopen a question.
export type MessageKind = "agree" | "disagree" | "question" | "comment" | "answer" | "followup";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  // The section version this message was written against.
  version: integer("version").notNull(),
  role: text("role").$type<Role>().notNull(),
  authorName: text("author_name").notNull(),
  kind: text("kind").$type<MessageKind>().notNull(),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The last two Markdown files imported into a document, kept verbatim.
export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull().default(""),
  markdown: text("markdown").notNull(),
  // e.g. "3 new, 5 changed, 1 removed"
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CheckStatus = "pending" | "passing" | "failing";

// One line of a feature spec in the developer's project (e.g. "BC-2 Changes are
// allowed until 24 hours before"), tied to the scope section it implements,
// with the latest test result. The specs themselves live in the developer's
// repo; this is the live copy the Progress tab shows.
export const specChecks = pgTable(
  "spec_checks",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    feature: text("feature").notNull().default(""),
    text: text("text").notNull(),
    position: integer("position").notNull(),
    // The section's version when this line was written against it.
    scopeVersion: integer("scope_version").notNull(),
    status: text("status").$type<CheckStatus>().notNull().default("pending"),
    // When a test result was last reported for this line.
    checkedAt: timestamp("checked_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.documentId, t.key)],
);

// One row per rate-limited call, e.g. bucket "create:<caller>". Rows older
// than a day are pruned.
export const rateEvents = pgTable("rate_events", {
  id: serial("id").primaryKey(),
  bucket: text("bucket").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Kept in sync with the tables above by hand. Every statement is idempotent so
// it can run on each cold start; ALTERs bring older databases up to date.
export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS documents (
    id serial PRIMARY KEY,
    title text NOT NULL,
    intro text NOT NULL DEFAULT '',
    client_name text NOT NULL,
    developer_name text NOT NULL,
    share_token text NOT NULL UNIQUE,
    admin_token text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1`,
  `CREATE TABLE IF NOT EXISTS sections (
    id serial PRIMARY KEY,
    document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    position integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE sections ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'section'`,
  `ALTER TABLE sections ADD COLUMN IF NOT EXISTS key text NOT NULL DEFAULT ''`,
  `ALTER TABLE sections ADD COLUMN IF NOT EXISTS group_label text`,
  `ALTER TABLE sections ADD COLUMN IF NOT EXISTS info_only boolean NOT NULL DEFAULT false`,
  // Items removed by an import used to be archived; they are now deleted. The
  // unused column stays so a still-running older deployment keeps working.
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'sections' AND column_name = 'archived_at') THEN
      DELETE FROM sections WHERE archived_at IS NOT NULL;
    END IF;
  END $$`,
  `CREATE TABLE IF NOT EXISTS section_versions (
    id serial PRIMARY KEY,
    section_id integer NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    version integer NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (section_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id serial PRIMARY KEY,
    section_id integer NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    version integer NOT NULL,
    role text NOT NULL CHECK (role IN ('client', 'developer')),
    author_name text NOT NULL,
    kind text NOT NULL,
    body text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  // The first release limited kind to four values; it is now validated in code.
  `ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check`,
  `CREATE TABLE IF NOT EXISTS imports (
    id serial PRIMARY KEY,
    document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_name text NOT NULL DEFAULT '',
    markdown text NOT NULL,
    summary text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS sections_document_idx ON sections (document_id)`,
  `CREATE INDEX IF NOT EXISTS messages_section_idx ON messages (section_id)`,
  `CREATE INDEX IF NOT EXISTS imports_document_idx ON imports (document_id)`,
  `CREATE TABLE IF NOT EXISTS spec_checks (
    id serial PRIMARY KEY,
    document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    section_id integer NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    key text NOT NULL,
    feature text NOT NULL DEFAULT '',
    text text NOT NULL,
    position integer NOT NULL,
    scope_version integer NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    checked_at timestamptz,
    UNIQUE (document_id, key)
  )`,
  `CREATE TABLE IF NOT EXISTS rate_events (
    id serial PRIMARY KEY,
    bucket text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS rate_events_bucket_idx ON rate_events (bucket, created_at)`,
];
