"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { MessageKind } from "@/db";
import {
  addMessage,
  addSection,
  createDocument,
  findDocumentByToken,
  reviseSection,
  updateDocument,
} from "@/lib/data";

// Anyone can POST to a server action, so every action re-checks the token and
// derives the caller's role from it. Nothing about the role comes from the form.

function field(form: FormData, name: string, maxLength: number) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function documentFields(form: FormData) {
  return {
    title: field(form, "title", 200),
    intro: field(form, "intro", 10_000),
    clientName: field(form, "clientName", 100) || "Client",
    developerName: field(form, "developerName", 100) || "Developer",
  };
}

async function requireDeveloper(token: string) {
  const found = await findDocumentByToken(token);
  if (!found || found.role !== "developer") throw new Error("Not allowed");
  return found.document;
}

export async function createDocumentAction(form: FormData) {
  const input = documentFields(form);
  if (!input.title) return;
  const adminToken = await createDocument(input);
  redirect(`/manage/${adminToken}`);
}

export async function updateDocumentAction(token: string, form: FormData) {
  const doc = await requireDeveloper(token);
  const input = documentFields(form);
  if (!input.title) return;
  await updateDocument(doc.id, input);
  refresh();
}

export async function addSectionAction(token: string, form: FormData) {
  const doc = await requireDeveloper(token);
  const title = field(form, "title", 200);
  const body = field(form, "body", 20_000);
  if (!title) return;
  await addSection(doc.id, title, body);
  refresh();
}

export async function reviseSectionAction(token: string, sectionId: number, form: FormData) {
  const doc = await requireDeveloper(token);
  const title = field(form, "title", 200);
  const body = field(form, "body", 20_000);
  if (!title) return;
  await reviseSection(doc.id, sectionId, title, body);
  refresh();
}

const CLIENT_KINDS: MessageKind[] = ["agree", "disagree", "question", "comment"];

export async function postMessageAction(token: string, sectionId: number, form: FormData) {
  const found = await findDocumentByToken(token);
  if (!found) throw new Error("Not allowed");
  const body = field(form, "body", 10_000);
  const requested = field(form, "kind", 20) as MessageKind;

  // Only the client records a stance; the developer always just replies.
  const kind: MessageKind =
    found.role === "client" && CLIENT_KINDS.includes(requested) ? requested : "comment";
  // Disagreements, questions and plain comments need an explanation.
  if (kind !== "agree" && !body) return;

  await addMessage(found.document, found.role, sectionId, kind, body);
  refresh();
}
