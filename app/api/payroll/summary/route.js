import { getResource } from "@/lib/local-api-store";
import { buildPayrollSummary } from "@/lib/payroll-summary";
import {
  getPersistentHrmsData,
  listPersistentResource
} from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";

export async function GET(request) {
  const persistentHrms = await getPersistentHrmsData();
  const persistentInvoices = await listPersistentResource("invoices");

  if (persistentHrms || persistentInvoices) {
    return Response.json(
      buildPayrollSummary({
        ...persistentHrms,
        invoices: persistentInvoices || []
      })
    );
  }

  const proxiedResponse = await proxyToConfiguredApi(request, "/api/payroll/summary");

  if (proxiedResponse) {
    return proxiedResponse;
  }

  return Response.json(
    buildPayrollSummary({
      approvals: getResource("approvals") || [],
      attendanceRecords: getResource("attendance-records") || [],
      documents: getResource("documents") || [],
      employees: getResource("employees") || [],
      invoices: getResource("invoices") || [],
      settings: getResource("settings") || []
    })
  );
}
