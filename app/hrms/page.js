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
      (await fetchServerApiJson("/api/hrms")) ||
      (await getPersistentHrmsData({ fallbackOnError: false })) ||
      getLocalSuiteData() ||
      getEnterpriseSuiteData();
  } catch (error) {
    data = {
      employees: [],
      leaveRequests: [],
      attendanceRecords: [],
      documents: [],
      loadError: error?.status ? error.message : "Unable to load saved HRMS records. Please try again shortly."
    };
  }

  return <HrmsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
