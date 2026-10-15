import VmsPageClient from "@/components/pages/vms-page";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }) {
  const { id } = await params;
  return <VmsPageClient initialInvoiceId={id} />;
}
