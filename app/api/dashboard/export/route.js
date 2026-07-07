import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { dashboardWidgetRows, getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const role = searchParams.get("role") || "Enterprise Admin";
  const widget = searchParams.get("widget") || "kpis";
  const format = String(searchParams.get("format") || "csv").toLowerCase();
  const dashboard = await getDashboardData({ range, role });
  const rows = dashboardWidgetRows(dashboard, widget);
  const basename = `talme-${widget}-${range}`;

  if (format === "pdf") {
    const pdf = await buildPdf(rows, `${dashboard.visibleWidgets.find((item) => item.id === widget)?.title || widget} Export`);
    return new Response(pdf, {
      headers: {
        "Content-Disposition": `attachment; filename="${basename}.pdf"`,
        "Content-Type": "application/pdf"
      }
    });
  }

  const csv = toCsv(rows);
  const extension = format === "excel" || format === "xlsx" ? "xls" : "csv";
  const contentType = extension === "xls" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8";

  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${basename}.${extension}"`,
      "Content-Type": contentType
    }
  });
}

function toCsv(rows) {
  if (!rows.length) return "No records\n";

  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function buildPdf(rows, title) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([842, 595]);
  let y = 552;

  page.drawText(title, { x: 36, y, size: 18, font: bold, color: rgb(0.08, 0.13, 0.2) });
  y -= 30;

  const lines = rows.length ? rows.slice(0, 80).map((row) =>
    Object.entries(row).map(([key, value]) => `${key}: ${String(value ?? "")}`).join(" | ")
  ) : ["No records"];

  for (const line of lines) {
    if (y < 36) {
      page = document.addPage([842, 595]);
      y = 552;
    }

    page.drawText(line.slice(0, 150), { x: 36, y, size: 9, font, color: rgb(0.08, 0.13, 0.2) });
    y -= 14;
  }

  return document.save();
}
