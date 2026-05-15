import { createAttendanceMasterPdf } from "@/lib/attendance-master-pdf";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const pdf = createAttendanceMasterPdf(body);
  const employeeId = body?.employee?.employeeId || "employee";
  const month = String(body?.monthLabel || "attendance").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance-master-${employeeId}-${month}.pdf"`
    }
  });
}
