import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ExcelJS from "exceljs";
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

  if (format === "excel" || format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Dashboard");
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    if (headers.length) {
      sheet.addRow(headers);
      sheet.addRows(rows.map((row) => headers.map((header) => row[header] ?? "")));
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.columns.forEach((column) => { column.width = 24; });
    } else {
      sheet.addRow(["No records"]);
    }
    return new Response(await workbook.xlsx.writeBuffer(), {
      headers: {
        "Content-Disposition": `attachment; filename="${basename}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    });
  }

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
  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${basename}.csv"`,
      "Content-Type": "text/csv; charset=utf-8"
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
  const text = typeof value === "string" && /^[\s]*[=+\-@]/.test(value) ? `'${value}` : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function buildPdf(rows, title) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([842, 595]);
  let y = 552;

  page.drawText(title, { x: 36, y, size: 18, font: bold, color: rgb(0.08, 0.13, 0.2) });
  y -= 30;

  const lines = rows.length ? rows.map((row) =>
    Object.entries(row).map(([key, value]) => `${key}: ${String(value ?? "").replace(/\u20b9/g, "INR ")}`).join(" | ")
  ) : ["No records"];

  for (const line of lines) {
    let part = "";
    for (const character of line) {
      if (character === "\n" || character === "\r" || font.widthOfTextAtSize(part + character, 9) > 770) {
        drawLine(part);
        part = "";
        if (character === "\n" || character === "\r") continue;
      }
      part += character;
    }
    if (part) drawLine(part);
  }

  function drawLine(text) {
    if (y < 36) {
      page = document.addPage([842, 595]);
      y = 552;
    }
    page.drawText(text, { x: 36, y, size: 9, font, color: rgb(0.08, 0.13, 0.2) });
    y -= 14;
  }

  return document.save();
}
