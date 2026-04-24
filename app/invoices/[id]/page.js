import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }) {
  await requireAuth("/payroll");
  await ensureSeedData();
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) notFound();

  return (
    <RecordDetailPage
      eyebrow="Invoice Detail"
      title={invoice.invoiceNo}
      brandEyebrow="Payroll Suite"
      primaryHref="/payroll"
      primaryLabel="Back To Payroll"
      summary={`${invoice.invoiceNo} from ${invoice.vendor} is tracked for ${invoice.amount} with ${invoice.status} status.`}
      details={[
        ["Vendor", invoice.vendor],
        ["Invoice No", invoice.invoiceNo],
        ["Attendance", invoice.attendance],
        ["Amount", invoice.amount],
        ["Status", invoice.status]
      ]}
      sections={[
        {
          title: "Finance Controls",
          items: [
            { label: "Attendance Lock", value: invoice.attendance },
            { label: "Approval Status", value: invoice.status },
            { label: "Payable Amount", value: invoice.amount }
          ]
        }
      ]}
    />
  );
}
