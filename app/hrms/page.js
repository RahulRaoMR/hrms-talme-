import HrmsPageClient from "@/components/pages/hrms-page";
import { requireAuth } from "@/lib/require-auth";
import { getEnterpriseSuiteData } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function HrmsPage() {
  await requireAuth("/hrms");
  const data = await getEnterpriseSuiteData();
  return <HrmsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
