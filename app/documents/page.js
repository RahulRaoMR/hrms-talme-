import DocumentsPageClient from "@/components/pages/documents-page";
import { requireAuth } from "@/lib/require-auth";
import { getDocumentRecords, getUploadedAssets } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  await requireAuth("/documents");
  const [documents, assets] = await Promise.all([getDocumentRecords(), getUploadedAssets()]);
  return <DocumentsPageClient data={JSON.parse(JSON.stringify({ documents, assets }))} />;
}
