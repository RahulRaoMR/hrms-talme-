import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { findFrontendRecord } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }) {
  const { id } = await params;
  const document = findFrontendRecord("document", id);
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
