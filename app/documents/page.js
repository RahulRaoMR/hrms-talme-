import DocumentsPageClient from "@/components/pages/documents-page";
import { getDocumentRecords, getUploadedAssets } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";
import { mergeDocumentRecords } from "@/lib/document-records";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  let documents = [];
  let assets = [];
  let loadError = "";

  try {
    [documents, assets] = await Promise.all([
      fetchServerApiJson("/api/documents"),
      fetchServerApiJson("/api/uploads")
    ]);

    if (!documents || !assets) {
      const [persistentDocuments, persistentAssets] = await Promise.all([
        listPersistentResource("documents", { fallbackOnError: false }),
        listPersistentResource("uploads", { fallbackOnError: false })
      ]);

      assets = persistentAssets || getResource("uploads") || getUploadedAssets();
      documents = persistentDocuments || getResource("documents") || getDocumentRecords();
    }
    documents = mergeDocumentRecords(documents, assets);
  } catch (error) {
    documents = [];
    assets = [];
    loadError = error?.status ? error.message : "Unable to load saved documents. Please try again shortly.";
  }

  return <DocumentsPageClient data={JSON.parse(JSON.stringify({ documents, assets, loadError }))} />;
}
