import HrmsPageClient from "@/components/pages/hrms-page";
import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function HrmsPage() {
  let data;

  try {
    data = (await fetchServerApiJson("/api/hrms")) || getEnterpriseSuiteData();
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
