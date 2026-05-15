import PerformanceRatingsPage from "@/components/pages/performance-ratings-page";
import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { getLocalSuiteData } from "@/lib/local-api-store";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function PerformanceRatingsRoute() {
  let data;

  try {
    data =
      (await getPersistentHrmsData()) ||
      (await fetchServerApiJson("/api/hrms")) ||
      getLocalSuiteData() ||
      getEnterpriseSuiteData();
  } catch {
    data = getLocalSuiteData() || getEnterpriseSuiteData();
  }

  return <PerformanceRatingsPage employees={JSON.parse(JSON.stringify(data.employees || []))} />;
}
