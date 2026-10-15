import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { getDocumentRecords, getUploadedAssets } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { mergeDocumentRecords } from "@/lib/document-records";
import { listPersistentResource } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }) {
  const { id } = await params;
  const documents = await getDocuments();
  const document = documents.find((item) => String(item.id) === String(id));

  if (!document) notFound();

  return (
    <RecordDetailPage
      eyebrow="Document Detail"
      title={document.docType}
      brandEyebrow="Compliance Suite"
      primaryHref="/documents"
      primaryLabel="Back To Documents"
      summary={`${document.docType} belongs to ${document.owner} in the ${document.module} module and is marked ${document.status}.`}
      details={[
        ["Owner", document.owner],
        ["Document Type", document.docType],
        ["Module", document.module],
        ["Expiry", document.expiry],
        ["Status", document.status]
      ]}
      sections={[
        {
          title: "Compliance Status",
          items: [
            { label: "Module", value: document.module },
            { label: "Expiry", value: document.expiry },
            { label: "Current Status", value: document.status }
          ]
        }
      ]}
    />
  );
}

async function getDocuments() {
  let [documents, assets] = await Promise.all([
    fetchServerApiJson("/api/documents"),
    fetchServerApiJson("/api/uploads")
  ]);

  if (!documents || !assets) {
    const [persistentDocuments, persistentAssets] = await Promise.all([
      listPersistentResource("documents"),
      listPersistentResource("uploads")
    ]);

    assets = persistentAssets || getResource("uploads") || getUploadedAssets();
    documents = persistentDocuments || getResource("documents") || getDocumentRecords();
  }

  return mergeDocumentRecords(documents, assets);
}
