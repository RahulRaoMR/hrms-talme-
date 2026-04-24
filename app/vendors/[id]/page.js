import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({ params }) {
  await requireAuth("/vms");
  await ensureSeedData();
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  return (
    <RecordDetailPage
      eyebrow="Vendor Detail"
      title={vendor.vendor}
      brandEyebrow="VMS Suite"
      primaryHref="/vms"
      primaryLabel="Back To VMS"
      summary={`${vendor.vendor} serves the ${vendor.category} category across ${vendor.sites} sites.`}
      details={[
        ["Category", vendor.category],
        ["Sites", vendor.sites],
        ["Rating", vendor.rating],
        ["Status", vendor.status],
        ["Tone", vendor.tone]
      ]}
      sections={[
        {
          title: "Vendor Controls",
          items: [
            { label: "Coverage", value: `${vendor.sites} sites` },
            { label: "Performance Rating", value: String(vendor.rating) },
            { label: "Operational Status", value: vendor.status }
          ]
        }
      ]}
    />
  );
}
