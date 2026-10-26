import type { Metadata } from "next";
import { DocumentPage } from "@/components/document-page";

export const metadata: Metadata = { title: "Manage document · Agreement Hub" };

export default function ManagePage({ params, searchParams }: PageProps<"/manage/[token]">) {
  return <DocumentPage params={params} searchParams={searchParams} role="developer" />;
}
