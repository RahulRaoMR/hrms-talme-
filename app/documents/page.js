import DocumentsPageClient from "@/components/pages/documents-page";
import { requireAuth } from "@/lib/require-auth";
import { getDocumentRecords } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  await requireAuth("/documents");
  const documents = await getDocumentRecords();
  return <DocumentsPageClient documents={JSON.parse(JSON.stringify(documents))} />;
}
