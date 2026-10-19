import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, max, or } from "drizzle-orm";
import {
  documents,
  getDb,
  messages,
  sections,
  sectionVersions,
  type MessageKind,
  type Role,
} from "@/db";

export type Status = "pending" | "agreed" | "disagreed" | "question";

export type Message = typeof messages.$inferSelect;
export type SectionVersion = typeof sectionVersions.$inferSelect;
export type Document = typeof documents.$inferSelect;

export type SectionView = {
  id: number;
  position: number;
  current: SectionVersion;
  history: SectionVersion[]; // older versions, newest first
  messages: Message[];
  status: Status;
};

export type DocumentView = {
  document: Document;
  role: Role;
  sections: SectionView[];
};

function newToken() {
  return randomBytes(18).toString("base64url");
}

const STANCE: Partial<Record<MessageKind, Status>> = {
  agree: "agreed",
  disagree: "disagreed",
  question: "question",
};

// A section's status is the client's latest stance on its *current* version.
// Editing a section therefore resets it to pending until the client responds again.
function statusOf(current: SectionVersion, msgs: Message[]): Status {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role !== "client" || m.version !== current.version) continue;
    const stance = STANCE[m.kind];
    if (stance) return stance;
  }
  return "pending";
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

  const secs = await db
    .select()
    .from(sections)
    .where(eq(sections.documentId, found.document.id))
    .orderBy(asc(sections.position), asc(sections.id));
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
        current,
        history: vs.slice(0, -1).reverse(),
        messages: ms,
        status: statusOf(current, ms),
      },
    ];
  });

  return { ...found, sections: views };
}

export async function createDocument(input: {
  title: string;
  intro: string;
  clientName: string;
  developerName: string;
}) {
  const db = await getDb();
  const [doc] = await db
    .insert(documents)
    .values({ ...input, shareToken: newToken(), adminToken: newToken() })
    .returning({ adminToken: documents.adminToken });
  return doc.adminToken;
}

export async function updateDocument(
  documentId: number,
  input: { title: string; intro: string; clientName: string; developerName: string },
) {
  const db = await getDb();
  await db
    .update(documents)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(documents.id, documentId));
}

export async function addSection(documentId: number, title: string, body: string) {
  const db = await getDb();
  const [{ last }] = await db
    .select({ last: max(sections.position) })
    .from(sections)
    .where(eq(sections.documentId, documentId));
  const [section] = await db
    .insert(sections)
    .values({ documentId, position: (last ?? 0) + 1 })
    .returning({ id: sections.id });
  await db.insert(sectionVersions).values({ sectionId: section.id, version: 1, title, body });
  await touch(documentId);
}

/** Returns the section if it belongs to the document, otherwise null. */
async function sectionInDocument(documentId: number, sectionId: number) {
  const db = await getDb();
  const [section] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.documentId, documentId)))
    .limit(1);
  return section ?? null;
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
  if (!(await sectionInDocument(documentId, sectionId))) return;
  const current = await currentVersion(sectionId);
  if (current && current.title === title && current.body === body) return;
  const db = await getDb();
  await db.insert(sectionVersions).values({
    sectionId,
    version: (current?.version ?? 0) + 1,
    title,
    body,
  });
  await touch(documentId);
}

export async function addMessage(
  document: Document,
  role: Role,
  sectionId: number,
  kind: MessageKind,
  body: string,
) {
  if (!(await sectionInDocument(document.id, sectionId))) return;
  const current = await currentVersion(sectionId);
  if (!current) return;
  const db = await getDb();
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

async function touch(documentId: number) {
  const db = await getDb();
  await db.update(documents).set({ updatedAt: new Date() }).where(eq(documents.id, documentId));
}
