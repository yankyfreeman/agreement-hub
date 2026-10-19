import type { Metadata } from "next";
import { DocumentPage } from "@/components/document-page";

export const metadata: Metadata = { title: "Manage document · Agreement Hub" };

export default function ManagePage({ params }: PageProps<"/manage/[token]">) {
  return <DocumentPage params={params} role="developer" />;
}
