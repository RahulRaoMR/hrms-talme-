import VendorPortalPageClient from "@/components/pages/vendor-portal-page";
import { getInvoices, getVendorWorkers, getVendors } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function VendorPortalPage() {
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
