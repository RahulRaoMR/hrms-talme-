import ShiftsPageClient from "@/components/pages/shifts-page";
import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { getLocalSuiteData, getResource } from "@/lib/local-api-store";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
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
      shiftAssignments: []
    };
  }

  return <ShiftsPageClient data={JSON.parse(JSON.stringify({
    ...data,
    shiftAssignments: data.shiftAssignments || getResource("shift-assignments") || []
  }))} />;
}
