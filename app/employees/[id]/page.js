import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }) {
  await requireAuth("/hrms");
  await ensureSeedData();
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  return (
    <RecordDetailPage
      eyebrow="Employee Detail"
      title={employee.name}
      brandEyebrow="HRMS Suite"
      primaryHref="/hrms"
      primaryLabel="Back To HRMS"
      summary={`${employee.name} is mapped to ${employee.department} at ${employee.location} under ${employee.manager}.`}
      details={[
        ["Employee ID", employee.employeeId],
        ["Email", employee.email || "Not added"],
        ["Department", employee.department],
        ["Location", employee.location],
        ["Manager", employee.manager],
        ["Grade", employee.grade],
        ["Joining Date", employee.joiningDate],
        ["Salary Band", employee.salaryBand],
        ["Bank Status", employee.bankStatus],
        ["Status", employee.status]
      ]}
      sections={[
        {
          title: "Lifecycle Controls",
          items: [
            { label: "Confirmation Status", value: employee.status },
            { label: "Payroll Ready", value: employee.bankStatus === "Verified" ? "Yes" : "Pending" },
            { label: "Email Ready", value: employee.email ? "Yes" : "Pending" },
            { label: "Reporting Manager", value: employee.manager }
          ]
        }
      ]}
    />
  );
}
