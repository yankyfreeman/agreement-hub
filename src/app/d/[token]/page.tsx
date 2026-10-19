import type { Metadata } from "next";
import { DocumentPage } from "@/components/document-page";

export const metadata: Metadata = { title: "Review document · Agreement Hub" };

export default function ClientPage({ params }: PageProps<"/d/[token]">) {
  return <DocumentPage params={params} role="client" />;
}
