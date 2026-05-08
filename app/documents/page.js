import DocumentsPageClient from "@/components/pages/documents-page";
import { getDocumentRecords, getUploadedAssets } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [documents, assets] = await Promise.all([getDocumentRecords(), getUploadedAssets()]);
  return <DocumentsPageClient data={JSON.parse(JSON.stringify({ documents, assets }))} />;
}
