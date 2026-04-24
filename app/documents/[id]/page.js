import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }) {
  await requireAuth("/documents");
  await ensureSeedData();
  const { id } = await params;
  const document = await prisma.documentRecord.findUnique({ where: { id } });
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
