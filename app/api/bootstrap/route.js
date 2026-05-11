import {
  getEnterpriseSuiteData,
  getFrontendCandidates,
  getFrontendInvoices,
  getFrontendVendors
} from "@/lib/frontend-data";
import { proxyToConfiguredApi } from "@/lib/server-api";

export async function GET(request) {
  const proxiedResponse = await proxyToConfiguredApi(request, "/api/bootstrap");

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const suite = getEnterpriseSuiteData();
  const candidates = getFrontendCandidates();
  const vendors = getFrontendVendors();
  const invoices = getFrontendInvoices();

  return Response.json({
    metrics: [
      {
        label: "Open Requisitions",
        value: String(candidates.length),
        meta: `${candidates.length} active candidate records`
      },
      {
        label: "Employee Master",
        value: String(suite.employees.length),
        meta: "Profiles, bank, grade, and lifecycle"
      },
      {
        label: "Active Vendors",
        value: String(vendors.length),
        meta: "Live vendor master"
      },
      {
        label: "Approved Invoices",
        value: String(invoices.filter((invoice) => invoice.status === "Approved").length),
        meta: "Finance-cleared queue"
      }
    ]
  });
}
