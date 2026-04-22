import VendorPortalPageClient from "@/components/pages/vendor-portal-page";
import { requireAuth } from "@/lib/require-auth";
import { getInvoices, getVendorWorkers, getVendors } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function VendorPortalPage() {
  await requireAuth("/vendor-portal");
  const [vendors, workers, invoices] = await Promise.all([
    getVendors({}),
    getVendorWorkers(),
    getInvoices({})
  ]);

  return (
    <VendorPortalPageClient
      data={JSON.parse(JSON.stringify({ vendors: vendors.items, workers, invoices: invoices.items }))}
    />
  );
}
