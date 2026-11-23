import type { Metadata } from "next";
import { DocumentPage } from "@/components/document-page";

export const metadata: Metadata = { title: "Review document · ag-hub" };

export default function ClientPage({ params, searchParams }: PageProps<"/d/[token]">) {
  return <DocumentPage params={params} searchParams={searchParams} role="client" />;
}
