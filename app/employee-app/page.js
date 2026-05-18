import EmployeePhoneApp from "@/components/pages/employee-phone-app";
import { getEmployeePortalData } from "@/lib/frontend-data";
import { getLocalSuiteData, getResource } from "@/lib/local-api-store";
import { getPayslipRecords } from "@/lib/payslip-store";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function EmployeeAppPage({ searchParams }) {
  let data;
  const params = await searchParams;
  const requestedEmployeeId = typeof params?.employeeId === "string" ? params.employeeId : "";

  try {
    const suiteData =
      (await getPersistentHrmsData()) ||
      (await fetchServerApiJson("/api/hrms")) ||
      getLocalSuiteData() ||
      getEmployeePortalData();

    data = {
      ...suiteData,
      shiftAssignments: suiteData.shiftAssignments || getResource("shift-assignments") || [],
      payslips: getPayslipRecords(),
      assets: suiteData.assets || []
    };
  } catch {
    data = {
      ...getEmployeePortalData(),
      payslips: getPayslipRecords()
    };
  }

  return (
    <EmployeePhoneApp
      data={JSON.parse(JSON.stringify(data))}
      employeeId={requestedEmployeeId}
    />
  );
}
