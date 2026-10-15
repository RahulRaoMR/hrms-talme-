import VendorPortalPageClient from "@/components/pages/vendor-portal-page";
import { getInvoices, getVendorWorkers, getVendors } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function VendorPortalPage() {
  let vendors = [];
  let workers = [];
  let invoices = [];
  let loadError = "";

  try {
    [vendors, workers, invoices] = await Promise.all([
      fetchServerApiJson("/api/vendors"),
      fetchServerApiJson("/api/vendor-workers"),
      fetchServerApiJson("/api/vendor-portal").then((data) => data?.invoices || null)
    ]);

    if (!vendors || !workers || !invoices) {
      const [persistentVendors, persistentWorkers, persistentInvoices] = await Promise.all([
        listPersistentResource("vendors", { fallbackOnError: false }),
        listPersistentResource("vendor-workers", { fallbackOnError: false }),
        listPersistentResource("invoices", { fallbackOnError: false })
      ]);

      vendors = persistentVendors || getResource("vendors") || getVendors({}).items;
      workers = persistentWorkers || getResource("vendor-workers") || getVendorWorkers();
      invoices = persistentInvoices || getResource("invoices") || getInvoices({}).items;
    }
  } catch (error) {
    loadError = error?.status ? error.message : "Unable to load saved vendor portal records. Please try again shortly.";
  }

  return (
    <VendorPortalPageClient
      data={JSON.parse(JSON.stringify({ vendors, workers, invoices, loadError }))}
    />
  );
}
