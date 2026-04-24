import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function linesForKind(kind, searchParams) {
  if (kind === "payslip") {
    return [
      "Talme HRMS - Payslip",
      `Employee: ${searchParams.get("employee") || "Manish Gupta"}`,
      `Month: ${searchParams.get("month") || "April 2026"}`,
      `Annual Band: ${searchParams.get("band") || "INR 9.6L"}`,
      `Status: ${searchParams.get("status") || "Ready for download"}`
    ];
  }

  if (kind === "invoice") {
    return [
      "Talme HRMS - Invoice Summary",
      `Vendor: ${searchParams.get("vendor") || "StaffCore India"}`,
      `Invoice No: ${searchParams.get("invoiceNo") || "INV-4388"}`,
      `Amount: ${searchParams.get("amount") || "INR 42,40,000"}`,
      `Status: ${searchParams.get("status") || "Approved"}`
    ];
  }

  return [
    "Talme HRMS - Offer Letter",
    `Candidate: ${searchParams.get("candidate") || "Neha Sharma"}`,
    `Role: ${searchParams.get("role") || "HRBP"}`,
    `Location: ${searchParams.get("location") || "Pune Plant"}`,
    `Status: ${searchParams.get("status") || "Draft"}`
  ];
}

export async function GET(request, { params }) {
  const resolved = await params;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { searchParams } = new URL(request.url);
  const lines = linesForKind(resolved.kind, searchParams);

  page.drawRectangle({
    x: 32,
    y: 750,
    width: 531,
    height: 60,
    color: rgb(0.84, 0.69, 0.41)
  });

  page.drawText("Talme Enterprise Suite", {
    x: 48,
    y: 785,
    size: 18,
    font: bold,
    color: rgb(0.05, 0.08, 0.12)
  });

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 48,
      y: 700 - index * 28,
      size: index === 0 ? 20 : 12,
      font: index === 0 ? bold : font,
      color: rgb(0.1, 0.14, 0.2)
    });
  });

  const bytes = await pdf.save();

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${resolved.kind}.pdf"`
    }
  });
}
