import EmployeePortalPageClient from "@/components/pages/employee-portal-page";
import { getEmployeePortalData } from "@/lib/frontend-data";
import { getLocalSuiteData, getResource } from "@/lib/local-api-store";
import { getPayslipRecords } from "@/lib/payslip-store";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function EmployeePortalPage() {
  let data;

  try {
    const suiteData =
      (await getPersistentHrmsData()) ||
      (await fetchServerApiJson("/api/hrms")) ||
      getLocalSuiteData() ||
      getEmployeePortalData();

    data = {
      ...suiteData,
      payslips: getPayslipRecords(),
      assets: suiteData.assets || getResource("uploads") || []
    };
  } catch {
    data = {
      ...getEmployeePortalData(),
      payslips: getPayslipRecords()
    };
  }

  return <EmployeePortalPageClient data={JSON.parse(JSON.stringify(data))} />;
}
