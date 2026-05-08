import EmployeePortalPageClient from "@/components/pages/employee-portal-page";
import { getEmployeePortalData } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function EmployeePortalPage() {
  const data = await getEmployeePortalData();
  return <EmployeePortalPageClient data={JSON.parse(JSON.stringify(data))} />;
}
