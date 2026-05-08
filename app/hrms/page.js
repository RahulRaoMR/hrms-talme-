import HrmsPageClient from "@/components/pages/hrms-page";
import { getEnterpriseSuiteData } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function HrmsPage() {
  const data = await getEnterpriseSuiteData();
  return <HrmsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
