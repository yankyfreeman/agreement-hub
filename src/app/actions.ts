"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { MessageKind } from "@/db";
import {
  addMessage,
  createFromMarkdown,
  findDocumentByToken,
  loadDocument,
  reimportMarkdown,
  reviseSection,
  toExistingItems,
  updateDocument,
} from "@/lib/data";

// Anyone can POST to a server action, so every action re-checks the token and
// derives the caller's role from it. Nothing about the role comes from the form.

export type FormState = { error?: string };

const MAX_MARKDOWN = 500_000;

function field(form: FormData, name: string, maxLength: number) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function importFields(form: FormData) {
  const markdown = form.get("markdown");
  return {
    markdown: typeof markdown === "string" ? markdown.slice(0, MAX_MARKDOWN) : "",
    fileName: field(form, "fileName", 200),
    infoKeys: new Set(form.getAll("info").filter((v): v is string => typeof v === "string")),
  };
}

async function requireDeveloper(token: string) {
  const found = await findDocumentByToken(token);
  if (!found || found.role !== "developer") throw new Error("Not allowed");
  return found.document;
}

export async function createFromMarkdownAction(_: FormState, form: FormData): Promise<FormState> {
  const input = importFields(form);
  if (!input.markdown.trim()) return { error: "Choose a Markdown file or paste its contents." };
  let adminToken: string;
  try {
    adminToken = await createFromMarkdown({
      ...input,
      clientName: field(form, "clientName", 100) || "Client",
      developerName: field(form, "developerName", 100) || "Developer",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Import failed." };
  }
  redirect(`/manage/${adminToken}`);
}

export async function reimportAction(
  token: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const view = await loadDocument(token);
  if (!view || view.role !== "developer") throw new Error("Not allowed");
  const input = importFields(form);
  if (!input.markdown.trim()) return { error: "Choose a Markdown file or paste its contents." };
  try {
    await reimportMarkdown(view.document, toExistingItems(view), input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Import failed." };
  }
  refresh();
  return {};
}

export async function updateDocumentAction(token: string, form: FormData) {
  const doc = await requireDeveloper(token);
  const title = field(form, "title", 200);
  if (!title) return;
  await updateDocument(doc.id, {
    title,
    intro: field(form, "intro", 10_000),
    clientName: field(form, "clientName", 100) || "Client",
    developerName: field(form, "developerName", 100) || "Developer",
  });
  refresh();
}

export async function reviseSectionAction(token: string, sectionId: number, form: FormData) {
  const doc = await requireDeveloper(token);
  const title = field(form, "title", 200);
  const body = field(form, "body", 50_000);
  if (!title) return;
  await reviseSection(doc.id, sectionId, title, body);
  refresh();
}

/** One response or reply on one item. Which kinds are allowed is decided in addMessage. */
export async function postMessageAction(token: string, sectionId: number, form: FormData) {
  const found = await findDocumentByToken(token);
  if (!found) throw new Error("Not allowed");
  await addMessage(
    found.document,
    found.role,
    sectionId,
    field(form, "kind", 20) as MessageKind,
    field(form, "body", 10_000),
  );
  refresh();
}

/** The client's answers to all questions, submitted together. Blank answers are skipped. */
export async function submitAnswersAction(token: string, form: FormData) {
  const found = await findDocumentByToken(token);
  if (!found || found.role !== "client") throw new Error("Not allowed");
  for (const [name, value] of form.entries()) {
    const id = Number(name.match(/^answer-(\d+)$/)?.[1]);
    if (!id || typeof value !== "string" || !value.trim()) continue;
    await addMessage(found.document, "client", id, "answer", value.trim().slice(0, 10_000));
  }
  refresh();
}
