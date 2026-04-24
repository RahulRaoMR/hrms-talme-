import EmployeePortalPageClient from "@/components/pages/employee-portal-page";
import { requireAuth } from "@/lib/require-auth";
import { getEmployeePortalData } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function EmployeePortalPage() {
  await requireAuth("/employee-portal");
  const data = await getEmployeePortalData();
  return <EmployeePortalPageClient data={JSON.parse(JSON.stringify(data))} />;
}
