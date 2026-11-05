import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  documents,
  getDb,
  imports,
  pruneHistory,
  messages,
  sections,
  sectionVersions,
  specChecks,
  type CheckStatus,
  type ItemKind,
  type MessageKind,
  type Role,
} from "@/db";
import {
  parseMarkdown,
  planImport,
  slug,
  summarizePlan,
  toMarkdown,
  withoutNumber,
  type ExistingItem,
  type ParsedDocument,
} from "./markdown-import";
import { when } from "./record";

export type Status =
  // sections
  | "pending"
  | "agreed"
  | "disagreed"
  | "question"
  | "info"
  // questions
  | "unanswered"
  | "answered"
  | "followup";

export type Message = typeof messages.$inferSelect;
export type SectionVersion = typeof sectionVersions.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ImportRecord = Omit<typeof imports.$inferSelect, "markdown">;
export type SpecCheck = typeof specChecks.$inferSelect;

export type SectionView = {
  id: number;
  position: number;
  kind: ItemKind;
  key: string;
  group: string | null;
  infoOnly: boolean;
  current: SectionVersion;
  /** The previous version, if any (only one is kept). */
  history: SectionVersion[];
  messages: Message[];
  status: Status;
};

export type DocumentView = {
  document: Document;
  role: Role;
  sections: SectionView[];
  imports: ImportRecord[];
  /** Spec lines synced from the developer's project, in spec order. */
  checks: SpecCheck[];
};

function newToken() {
  return randomBytes(18).toString("base64url");
}

const STANCE: Partial<Record<MessageKind, Status>> = {
  agree: "agreed",
  disagree: "disagreed",
  question: "question",
};

// Status is always about the *current* version, so changing an item resets it
// until the client responds again.
// - Section: the client's latest stance (agree / disagree / question).
// - Question: answered once the client answers, back to "followup" if the
//   developer asks for more after that.
function statusOf(
  item: { kind: ItemKind; infoOnly: boolean },
  current: SectionVersion,
  msgs: Message[],
): Status {
  if (item.kind === "section" && item.infoOnly) return "info";
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.version !== current.version) continue;
    if (item.kind === "question") {
      if (m.kind === "answer") return "answered";
      if (m.kind === "followup") return "followup";
    } else if (m.role === "client") {
      const stance = STANCE[m.kind];
      if (stance) return stance;
    }
  }
  return item.kind === "question" ? "unanswered" : "pending";
}

/** Resolves a token to its document and the role it grants. */
export async function findDocumentByToken(
  token: string,
): Promise<{ document: Document; role: Role } | null> {
  const db = await getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(or(eq(documents.adminToken, token), eq(documents.shareToken, token)))
    .limit(1);
  if (!doc) return null;
  return { document: doc, role: doc.adminToken === token ? "developer" : "client" };
}

export async function loadDocument(token: string): Promise<DocumentView | null> {
  const found = await findDocumentByToken(token);
  if (!found) return null;
  const db = await getDb();

  const [secs, importRows, checks] = await Promise.all([
    db
      .select()
      .from(sections)
      .where(eq(sections.documentId, found.document.id))
      .orderBy(asc(sections.position), asc(sections.id)),
    found.role === "developer"
      ? db
          .select({
            id: imports.id,
            documentId: imports.documentId,
            fileName: imports.fileName,
            summary: imports.summary,
            createdAt: imports.createdAt,
          })
          .from(imports)
          .where(eq(imports.documentId, found.document.id))
          .orderBy(desc(imports.createdAt))
      : Promise.resolve([]),
    db
      .select()
      .from(specChecks)
      .where(eq(specChecks.documentId, found.document.id))
      .orderBy(asc(specChecks.position)),
  ]);
  const ids = secs.map((s) => s.id);

  const [versions, msgs] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(sectionVersions)
          .where(inArray(sectionVersions.sectionId, ids))
          .orderBy(asc(sectionVersions.version)),
        db
          .select()
          .from(messages)
          .where(inArray(messages.sectionId, ids))
          .orderBy(asc(messages.createdAt), asc(messages.id)),
      ])
    : [[], []];

  const views: SectionView[] = secs.flatMap((s) => {
    const vs = versions.filter((v) => v.sectionId === s.id);
    const current = vs.at(-1);
    if (!current) return [];
    const ms = msgs.filter((m) => m.sectionId === s.id);
    return [
      {
        id: s.id,
        position: s.position,
        kind: s.kind,
        key: s.key,
        group: s.groupLabel,
        infoOnly: s.infoOnly,
        current,
        history: vs.slice(0, -1).reverse(),
        messages: ms,
        status: statusOf(s, current, ms),
      },
    ];
  });

  return { ...found, sections: views, imports: importRows, checks };
}

export function toExistingItems(view: DocumentView): ExistingItem[] {
  return view.sections.map((s) => ({
    id: s.id,
    kind: s.kind,
    key: s.key,
    title: s.current.title,
    body: s.current.body,
    infoOnly: s.infoOnly,
  }));
}

/**
 * The document as it stands now (including edits made on the website) as
 * Markdown, with its version and the time under the title. Re-importing it
 * unchanged leaves every item unchanged.
 */
export function documentMarkdown(view: DocumentView, savedAt = new Date()) {
  return toMarkdown({
    title: view.document.title,
    intro: view.document.intro,
    version: { number: view.document.version, savedAt: when(savedAt) },
    items: view.sections.map((s) => ({
      kind: s.kind,
      key: s.key,
      title: s.current.title,
      body: s.current.body,
      group: s.group,
    })),
  });
}

/** The default prefix for the project's files, e.g. "booking-app". Developers can change it. */
export function filePrefix(document: Document) {
  return slug(withoutNumber(document.title).replace(/:?\s*project scope$/i, "")) || "project";
}

/**
 * A snapshot's file name in the project, e.g. "booking-app-scope-v3_2026-10-22_14-30.md".
 * The time is UTC and matches the "Saved" time written inside the file.
 */
export function snapshotName(document: Document, kind: "scope" | "record", savedAt: Date) {
  const [date, time] = savedAt.toISOString().slice(0, 16).split("T");
  return `${filePrefix(document)}-${kind}-v${document.version}_${date}_${time.replace(":", "-")}.md`;
}

const nextVersion = sql`${documents.version} + 1`;

export async function updateDocument(
  document: Document,
  input: { title: string; intro: string; clientName: string; developerName: string },
) {
  const changed = input.title !== document.title || input.intro !== document.intro;
  const db = await getDb();
  await db
    .update(documents)
    .set({ ...input, ...(changed && { version: nextVersion }), updatedAt: new Date() })
    .where(eq(documents.id, document.id));
}

// ---------------------------------------------------------------------------
// Markdown import

export type ImportInput = {
  markdown: string;
  fileName: string;
  /** Keys of sections the developer marked info-only in the preview. */
  infoKeys: Set<string>;
};


export async function createFromMarkdown(
  input: ImportInput & { clientName: string; developerName: string },
) {
  const parsed = parseMarkdown(input.markdown);
  if (!parsed.items.length) throw new Error("No sections or questions found in the file.");
  const db = await getDb();
  const [doc] = await db
    .insert(documents)
    .values({
      title: parsed.title || input.fileName.replace(/\.md$/i, "") || "Untitled document",
      intro: parsed.intro,
      clientName: input.clientName,
      developerName: input.developerName,
      shareToken: newToken(),
      adminToken: newToken(),
    })
    .returning();
  await applyImport(doc.id, parsed, [], input);
  return doc.adminToken;
}

/** Imports a new version of the document; returns its version number. */
export async function reimportMarkdown(document: Document, existing: ExistingItem[], input: ImportInput) {
  const parsed = parseMarkdown(input.markdown);
  if (!parsed.items.length) throw new Error("No sections or questions found in the file.");
  const title = parsed.title || document.title;
  const plan = planImport(existing, parsed.items);
  const changed =
    title !== document.title ||
    parsed.intro !== document.intro ||
    plan.removed.length > 0 ||
    plan.matches.some((m) => m.change !== "unchanged" || m.renumbered);
  const db = await getDb();
  const [row] = await db
    .update(documents)
    .set({ title, intro: parsed.intro, ...(changed && { version: nextVersion }) })
    .where(eq(documents.id, document.id))
    .returning({ version: documents.version });
  await applyImport(document.id, parsed, existing, input);
  return row.version;
}

async function applyImport(
  documentId: number,
  parsed: ParsedDocument,
  existing: ExistingItem[],
  input: ImportInput,
) {
  const db = await getDb();
  const plan = planImport(existing, parsed.items);
  const fields = (item: ParsedDocument["items"][number], position: number) => ({
    position,
    kind: item.kind,
    key: item.key,
    groupLabel: item.group,
    infoOnly: item.kind === "section" && input.infoKeys.has(item.key),
  });

  // New items: insert sections, then their first versions.
  const added = plan.matches
    .map((m, i) => ({ ...m, position: i + 1 }))
    .filter((m) => !m.existing);
  if (added.length) {
    const rows = await db
      .insert(sections)
      .values(added.map((m) => ({ documentId, ...fields(m.item, m.position) })))
      .returning({ id: sections.id, position: sections.position });
    const idByPosition = new Map(rows.map((r) => [r.position, r.id]));
    await db.insert(sectionVersions).values(
      added.map((m) => ({
        sectionId: idByPosition.get(m.position)!,
        version: 1,
        title: m.item.title,
        body: m.item.body,
      })),
    );
  }

  // Matched items: refresh their place in the outline; changed text becomes a
  // new version (the previous one is kept, older ones are pruned below).
  const matched = plan.matches.flatMap((m, i) =>
    m.existing ? [{ ...m, existing: m.existing, position: i + 1 }] : [],
  );
  const changedIds = matched.filter((m) => m.change === "changed").map((m) => m.existing.id);
  const renumbered = matched.filter((m) => m.renumbered);
  const versionIds = [...changedIds, ...renumbered.map((m) => m.existing.id)];
  const latest = versionIds.length
    ? await db
        .select({ sectionId: sectionVersions.sectionId, version: sectionVersions.version })
        .from(sectionVersions)
        .where(inArray(sectionVersions.sectionId, versionIds))
    : [];
  const versionOf = (id: number) =>
    Math.max(0, ...latest.filter((v) => v.sectionId === id).map((v) => v.version));

  await Promise.all([
    ...matched.map((m) =>
      db
        .update(sections)
        .set(fields(m.item, m.position))
        .where(eq(sections.id, m.existing.id)),
    ),
    // A heading number change (4.5 → 4.6) is not a change in what was agreed,
    // so it updates the current version's title instead of adding a version.
    ...renumbered.map((m) =>
      db
        .update(sectionVersions)
        .set({ title: m.item.title })
        .where(
          and(
            eq(sectionVersions.sectionId, m.existing.id),
            eq(sectionVersions.version, versionOf(m.existing.id)),
          ),
        ),
    ),
  ]);
  if (changedIds.length) {
    await db.insert(sectionVersions).values(
      matched
        .filter((m) => m.change === "changed")
        .map((m) => ({
          sectionId: m.existing.id,
          version: versionOf(m.existing.id) + 1,
          title: m.item.title,
          body: m.item.body,
        })),
    );
  }

  // Items no longer in the file are deleted with their versions and messages.
  if (plan.removed.length) {
    await db.delete(sections).where(inArray(sections.id, plan.removed.map((e) => e.id)));
  }

  await db.insert(imports).values({
    documentId,
    fileName: input.fileName,
    markdown: input.markdown,
    summary: summarizePlan(plan),
  });
  await pruneHistory(db, documentId);
  await touch(documentId);
}

export async function getImportMarkdown(documentId: number, importId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ fileName: imports.fileName, markdown: imports.markdown })
    .from(imports)
    .where(and(eq(imports.id, importId), eq(imports.documentId, documentId)))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Edits and responses

/** Returns the item if it belongs to the document. */
async function liveItem(documentId: number, sectionId: number) {
  const db = await getDb();
  const [item] = await db
    .select({ id: sections.id, kind: sections.kind, infoOnly: sections.infoOnly })
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.documentId, documentId)))
    .limit(1);
  return item ?? null;
}

async function currentVersion(sectionId: number) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(sectionVersions)
    .where(eq(sectionVersions.sectionId, sectionId))
    .orderBy(desc(sectionVersions.version))
    .limit(1);
  return row;
}

export async function reviseSection(
  documentId: number,
  sectionId: number,
  title: string,
  body: string,
) {
  if (!(await liveItem(documentId, sectionId))) return;
  const current = await currentVersion(sectionId);
  if (current && current.title === title && current.body === body) return;
  const db = await getDb();
  await db.insert(sectionVersions).values({
    sectionId,
    version: (current?.version ?? 0) + 1,
    title,
    body,
  });
  await db.update(documents).set({ version: nextVersion }).where(eq(documents.id, documentId));
  await pruneHistory(db, documentId);
  await touch(documentId);
}

const SECTION_STANCES: MessageKind[] = ["agree", "disagree", "question", "comment"];

/** Which message kind a role may post on an item; null if none. */
function resolveKind(
  item: { kind: ItemKind; infoOnly: boolean },
  role: Role,
  requested: MessageKind,
): MessageKind {
  if (role === "developer") {
    return item.kind === "question" && requested === "followup" ? "followup" : "comment";
  }
  if (item.kind === "question") return "answer";
  if (item.infoOnly) return "comment";
  return SECTION_STANCES.includes(requested) ? requested : "comment";
}

export async function addMessage(
  document: Document,
  role: Role,
  sectionId: number,
  requested: MessageKind,
  body: string,
) {
  const item = await liveItem(document.id, sectionId);
  if (!item) return;
  const kind = resolveKind(item, role, requested);
  // Only a plain agreement may be posted without text.
  if (kind !== "agree" && !body) return;
  const current = await currentVersion(sectionId);
  if (!current) return;
  const db = await getDb();
  // Agreeing twice to the same version adds nothing: the client can still
  // disagree or comment.
  if (kind === "agree") {
    const onVersion = await db
      .select()
      .from(messages)
      .where(and(eq(messages.sectionId, sectionId), eq(messages.version, current.version)))
      .orderBy(asc(messages.id));
    if (statusOf(item, current, onVersion) === "agreed") return;
  }
  await db.insert(messages).values({
    sectionId,
    version: current.version,
    role,
    authorName: role === "client" ? document.clientName : document.developerName,
    kind,
    body,
  });
  await touch(document.id);
}

// ---------------------------------------------------------------------------
// Specs and progress

export type SpecLine = { key: string; sectionId: number; feature: string; text: string };

/**
 * Replaces the document's spec lines with the developer's current list. A line
 * keeps its test result unless its text or section changed (then it needs
 * verifying again); lines no longer listed are removed.
 */
export async function syncSpecs(view: DocumentView, lines: SpecLine[]) {
  const db = await getDb();
  const documentId = view.document.id;
  const versionOf = new Map(view.sections.map((s) => [s.id, s.current.version]));
  const existing = new Map(view.checks.map((c) => [c.key, c]));
  const listed = new Set(lines.map((l) => l.key));
  const counts = { added: 0, changed: 0, unchanged: 0, removed: 0 };

  const removed = view.checks.filter((c) => !listed.has(c.key));
  if (removed.length) {
    await db.delete(specChecks).where(inArray(specChecks.id, removed.map((c) => c.id)));
  }
  counts.removed = removed.length;

  const added = [];
  for (const [i, line] of lines.entries()) {
    const fields = { sectionId: line.sectionId, feature: line.feature, text: line.text, position: i + 1 };
    const scopeVersion = versionOf.get(line.sectionId)!;
    const old = existing.get(line.key);
    if (!old) {
      added.push({ documentId, key: line.key, scopeVersion, ...fields });
    } else if (old.text !== line.text || old.sectionId !== line.sectionId) {
      await db
        .update(specChecks)
        .set({ ...fields, scopeVersion, status: "pending", checkedAt: null })
        .where(eq(specChecks.id, old.id));
      counts.changed++;
    } else {
      if (old.position !== fields.position || old.feature !== fields.feature) {
        await db
          .update(specChecks)
          .set({ position: fields.position, feature: fields.feature })
          .where(eq(specChecks.id, old.id));
      }
      counts.unchanged++;
    }
  }
  if (added.length) await db.insert(specChecks).values(added);
  counts.added = added.length;
  return counts;
}

/** Records test results for spec lines, by key. */
export async function reportProgress(
  documentId: number,
  results: { key: string; status: CheckStatus }[],
) {
  const db = await getDb();
  const checkedAt = new Date();
  for (const status of ["pending", "passing", "failing"] as const) {
    const keys = results.filter((r) => r.status === status).map((r) => r.key);
    if (!keys.length) continue;
    await db
      .update(specChecks)
      .set({ status, checkedAt })
      .where(and(eq(specChecks.documentId, documentId), inArray(specChecks.key, keys)));
  }
}

async function touch(documentId: number) {
  const db = await getDb();
  await db.update(documents).set({ updatedAt: new Date() }).where(eq(documents.id, documentId));
}
