import EmployeePhoneApp from "@/components/pages/employee-phone-app";
import { getEmployeePortalData } from "@/lib/frontend-data";
import { getLocalSuiteData, getResource } from "@/lib/local-api-store";
import { getPayslipRecords } from "@/lib/payslip-store";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import EmployeeMobileApp from "@/components/pages/employee-mobile-app";

export const dynamic = "force-dynamic";

export default async function EmployeeAppPage({ searchParams }) {
  let data;
  const params = await searchParams;
  // Native pages contain no employee data until the mobile session is restored
  // and checked by the authenticated, employee-scoped API.
  if (params?.mobile === "1" || /TalmeEmployeeApp\//.test((await headers()).get("user-agent") || "")) {
    return <EmployeeMobileApp />;
  }
  const requestedEmployeeId = typeof params?.employeeId === "string" ? params.employeeId : "";

  if (!requestedEmployeeId.trim()) {
    redirect("/employee-app/login");
  }

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
