import EmployeePhoneApp from "@/components/pages/employee-phone-app";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getEmployeePortalData } from "@/lib/query-data";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function EmployeeAppPage() {
  const session = await auth();

  if (!session?.user || !canAccess(session.user.role, "/employee-app")) {
    redirect("/employee-app/login");
  }

  const data = await getEmployeePortalData();

  return (
    <EmployeePhoneApp
      data={JSON.parse(JSON.stringify(data))}
      employeeId={session.user.employeeId}
    />
  );
}
