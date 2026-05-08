import EmployeePhoneApp from "@/components/pages/employee-phone-app";
import { getEmployeePortalData } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function EmployeeAppPage() {
  const data = await getEmployeePortalData();

  return (
    <EmployeePhoneApp
      data={JSON.parse(JSON.stringify(data))}
      employeeId={data.employees[0]?.employeeId}
    />
  );
}
