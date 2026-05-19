import ReportsPageClient from "@/components/pages/reports-page";
import { getLiveReportData } from "@/lib/report-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getLiveReportData();
  return <ReportsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
