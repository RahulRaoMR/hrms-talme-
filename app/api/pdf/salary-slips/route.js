import { createPayslipPdf } from "@/lib/payslip-pdf";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const pdf = createPayslipPdf(rows.length ? rows : [{ employee: "No salary rows", month: body.month || "Current Month" }]);
  const fileMonth = String(body.month || "current-month").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="salary-slips-${fileMonth}.pdf"`
    }
  });
}
