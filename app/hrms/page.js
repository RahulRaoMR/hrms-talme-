import HrmsPageClient from "@/components/pages/hrms-page";
import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { getLocalSuiteData } from "@/lib/local-api-store";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function HrmsPage() {
  let data;

  try {
    data =
      (await getPersistentHrmsData()) ||
      (await fetchServerApiJson("/api/hrms")) ||
      getLocalSuiteData() ||
      getEnterpriseSuiteData();
  } catch {
    data = {
      employees: [],
      leaveRequests: [],
      attendanceRecords: [],
      documents: []
    };
  }

  return <HrmsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
