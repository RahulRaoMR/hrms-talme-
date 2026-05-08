import { getInvoices, getVendorWorkers, getVendors } from "@/lib/query-data";

export async function getVendorPortalModuleData() {
  const [vendors, workers, invoices] = await Promise.all([
    getVendors({}),
    getVendorWorkers(),
    getInvoices({})
  ]);

  return {
    vendors: vendors.items,
    workers,
    invoices: invoices.items
  };
}
