import LeavesPageClient from "@/components/pages/leaves-page";
import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { getLocalSuiteData } from "@/lib/local-api-store";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function LeavesPage() {
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
      attendanceRecords: []
    };
  }

  return <LeavesPageClient data={JSON.parse(JSON.stringify(data))} />;
}
