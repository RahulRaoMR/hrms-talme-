import ReportsPageClient from "@/components/pages/reports-page";
import { requireAuth } from "@/lib/require-auth";
import { getReportData } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAuth("/reports");
  const data = await getReportData();
  return <ReportsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
