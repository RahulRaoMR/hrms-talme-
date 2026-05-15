import { buildPayslipRowsFromQuery, createPayslipPdf } from "@/lib/payslip-pdf";

export async function GET(request) {
  const rows = buildPayslipRowsFromQuery(new URL(request.url).searchParams);
  const pdf = createPayslipPdf(rows);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payslip.pdf"`
    }
  });
}
