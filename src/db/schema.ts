import {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sections are never edited in place: every change adds a new version so the
// record shows exactly what text each response was made against.
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
export type MessageKind = "agree" | "disagree" | "question" | "comment";

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

// Kept in sync with the tables above by hand. Every statement is idempotent so
// it can run on each cold start.
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
  `CREATE TABLE IF NOT EXISTS sections (
    id serial PRIMARY KEY,
    document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    position integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
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
    kind text NOT NULL CHECK (kind IN ('agree', 'disagree', 'question', 'comment')),
    body text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS sections_document_idx ON sections (document_id)`,
  `CREATE INDEX IF NOT EXISTS messages_section_idx ON messages (section_id)`,
];
