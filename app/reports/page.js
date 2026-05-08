import ReportsPageClient from "@/components/pages/reports-page";
import { getReportData } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getReportData();
  return <ReportsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
