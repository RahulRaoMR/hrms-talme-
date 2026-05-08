import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { isEmailConfigured, sendEmail } from "@/services/emailService";
import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

const pageSize = [595, 842];
const payslipLogoPath = path.join(process.cwd(), "public", "talme-logo-pdf.png");

function safeText(value, fallback = "-") {
  return String(value ?? fallback).replace(/\u20b9/g, "INR ");
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `INR ${Math.round(amount).toLocaleString("en-IN")}`;
}

function formatMoneyPlain(value) {
  const amount = Number(value) || 0;
  return Math.round(amount).toLocaleString("en-IN");
}

function parseMoneyValue(value) {
  const normalized = String(value || "").replace(/,/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  return match ? Number(match[1]) : 0;
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function formatDecimal(value) {
  return (Number(value) || 0).toFixed(1);
}

function formatPayPeriod(month) {
  const date = new Date(`1 ${month}`);

  if (Number.isNaN(date.getTime())) {
    return safeText(month);
  }

  return `${date.toLocaleString("en-US", { month: "short" })}-${String(date.getFullYear()).slice(-2)}`;
}

function getNumberParam(searchParams, key, fallback = 0) {
  const value = searchParams.get(key);

  if (value === null || value === "") {
    return fallback;
  }

  return Number(value) || fallback;
}

function buildPayslipRowFromParams(searchParams) {
  const monthlyCtc = getNumberParam(searchParams, "monthlyCtc", parseMoneyValue(searchParams.get("band")));
  const monthlyNetPay = getNumberParam(searchParams, "monthlyNetPay", monthlyCtc);
  const grossEarnings = getNumberParam(searchParams, "salaryExcludingOt", monthlyNetPay);
  const totalPay = getNumberParam(searchParams, "totalPay", monthlyNetPay);
  const otAmount = getNumberParam(searchParams, "otAmount", 0);

  return {
    employeeId: searchParams.get("employeeId") || "TTPL-0001",
    name: searchParams.get("employee") || "Employee",
    designation: searchParams.get("designation") || "",
    department: searchParams.get("department") || "",
    joiningDate: searchParams.get("joiningDate") || "",
    bankName: searchParams.get("bankName") || "",
    accountNo: searchParams.get("accountNo") || "",
    pan: searchParams.get("pan") || "",
    uan: searchParams.get("uan") || "",
    monthDays: getNumberParam(searchParams, "monthDays", 0),
    presentDays: getNumberParam(searchParams, "presentDays", 0),
    paidLeaves: getNumberParam(searchParams, "paidLeaves", 0),
    lopDays: getNumberParam(searchParams, "lopDays", 0),
    monthlyCtc,
    monthlyNetPay,
    salaryDays: getNumberParam(searchParams, "salaryDays", getNumberParam(searchParams, "presentDays", 0)),
    salaryExcludingOt: grossEarnings,
    otHours: getNumberParam(searchParams, "otHours", 0),
    otAmount,
    totalPay
  };
}

function hasRecipientEmail(value) {
  return String(value || "").trim().includes("@");
}

function getPayslipFileName(row, month) {
  const employeeId = safeText(row.employeeId || row.name || "employee")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const period = safeText(month || "current-month")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `payslip-${employeeId || "employee"}-${period || "current-month"}.pdf`;
}

function payslipShareTemplate(name, month) {
  return renderEmailShell(
    "Payslip Ready",
    `
      <p>Hi ${escapeHtml(name || "Employee")},</p>
      <p>Your payslip for <strong>${escapeHtml(month || "this month")}</strong> is attached.</p>
      <p>Please review the attached PDF and contact HR or Payroll Desk for any queries.</p>
    `
  );
}

async function shareSalarySlips({ rows = [], month = "Current Month" }) {
  if (!isEmailConfigured()) {
    return {
      total: rows.length,
      sent: 0,
      skipped: rows.length,
      failed: 0,
      periodLabel: month,
      results: rows.map((row) => ({
        employeeId: row.employeeId,
        name: row.name,
        email: row.email,
        sent: false,
        reason: "Email service is not configured."
      }))
    };
  }

  const results = [];

  for (const row of rows) {
    const recipient = String(row.email || "").trim();

    if (!hasRecipientEmail(recipient)) {
      results.push({
        employeeId: row.employeeId,
        name: row.name,
        email: recipient,
        sent: false,
        skipped: true,
        reason: "Missing registered email."
      });
      continue;
    }

    try {
      const bytes = await buildSalarySlipsPdf({ rows: [row], month });
      const attachment = Buffer.from(bytes);
      const info = await sendEmail(
        recipient,
        `Your Payslip - ${month}`,
        payslipShareTemplate(row.name, month),
        {
          text: `Hi ${row.name || "Employee"}, your payslip for ${month} is attached.`,
          attachments: [
            {
              filename: getPayslipFileName(row, month),
              content: attachment,
              contentType: "application/pdf"
            }
          ]
        }
      );

      results.push({
        employeeId: row.employeeId,
        name: row.name,
        email: recipient,
        sent: true,
        reason: info.messageId || info.response || "Email delivered."
      });
    } catch (error) {
      console.error(`Payslip email failed for ${row.employeeId || row.name}:`, error);
      results.push({
        employeeId: row.employeeId,
        name: row.name,
        email: recipient,
        sent: false,
        reason: error?.message || "Email delivery failed."
      });
    }
  }

  const sent = results.filter((result) => result.sent).length;
  const skipped = results.filter((result) => result.skipped).length;

  return {
    total: rows.length,
    sent,
    skipped,
    failed: rows.length - sent - skipped,
    periodLabel: month,
    results
  };
}

function linesForKind(kind, searchParams) {
  if (kind === "payslip") {
    return [
      "Talme HRMS - Payslip",
      `Employee: ${searchParams.get("employee") || "Employee"}`,
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

function drawText(page, text, options) {
  page.drawText(safeText(text), options);
}

function drawCenteredText(page, text, { x, y, width, size, font, color }) {
  const safe = safeText(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  drawText(page, safe, {
    x: x + (width - textWidth) / 2,
    y,
    size,
    font,
    color
  });
}

function drawGridCell(page, text, { x, y, width, height, font, bold, size = 9, align = "left", borderWidth = 1, pad = 4 }) {
  const safe = safeText(text, "");
  const selectedFont = bold ? bold : font;
  const textWidth = selectedFont.widthOfTextAtSize(safe, size);
  const textX = align === "center" ? x + (width - textWidth) / 2 : align === "right" ? x + width - pad - textWidth : x + pad;

  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0, 0, 0),
    borderWidth
  });
  drawText(page, safe, {
    x: textX,
    y: y + (height - size) / 2 + 1,
    size,
    font: selectedFont,
    color: rgb(0, 0, 0)
  });
}

function calculateEarningsBreakup(grossEarnings) {
  const gross = Math.max(0, Math.round(Number(grossEarnings) || 0));
  const conveyance = gross >= 625 ? 625 : 0;
  const basic = Math.round(gross * 0.5);
  const hra = Math.round(gross * 0.2);
  const special = Math.max(0, gross - basic - hra - conveyance);

  return { basic, hra, conveyance, special, gross };
}

function drawPayslipBreakup(page, { row, month, grossEarnings, totalDeduction, font, bold, sheetX, sheetWidth }) {
  const leftWidth = 265;
  const rightWidth = sheetWidth - leftWidth;
  const labelWidth = 135;
  const amountWidth = leftWidth - labelWidth;
  const rightLabelWidth = 135;
  const rightAmountWidth = rightWidth - rightLabelWidth;
  const employeeRows = [
    ["Employee Name", row.name],
    ["Employee ID", row.employeeId],
    ["Designation", row.designation || row.grade || ""],
    ["Department", row.department || ""],
    ["Date of Joining", row.joiningDate || ""],
    ["Salary Pay Period", formatPayPeriod(month)],
    ["Employee PAN", row.pan || row.employeePan || ""],
    ["Employee UAN", row.uan || row.employeeUan || ""]
  ];
  const paidDays = Number(row.salaryDays) || Number(row.presentDays) || 0;
  const lopDays = Number(row.lopDays) || 0;
  const bankName = row.bankName && row.bankName !== "Pending" ? row.bankName : "";
  const summaryTop = 645;
  const headerHeight = 20;
  const rowHeight = 18;

  drawGridCell(page, "Employee Pay Summary", {
    x: sheetX,
    y: summaryTop - headerHeight,
    width: leftWidth,
    height: headerHeight,
    font,
    bold,
    size: 10,
    align: "center",
    borderWidth: 1.2
  });
  drawGridCell(page, "Employee Net Pay", {
    x: sheetX + leftWidth,
    y: summaryTop - headerHeight,
    width: rightWidth,
    height: headerHeight,
    font,
    bold,
    size: 10,
    align: "center",
    borderWidth: 1.2
  });

  employeeRows.forEach(([label, value], index) => {
    const y = summaryTop - headerHeight - (index + 1) * rowHeight;
    drawGridCell(page, label, { x: sheetX, y, width: labelWidth, height: rowHeight, font, bold: font, size: 9 });
    drawGridCell(page, value, { x: sheetX + labelWidth, y, width: amountWidth, height: rowHeight, font, bold, size: 9 });
  });

  drawGridCell(page, formatMoney(totalDeduction > grossEarnings ? 0 : grossEarnings - totalDeduction), {
    x: sheetX + leftWidth,
    y: summaryTop - headerHeight - 2 * rowHeight,
    width: rightWidth,
    height: 2 * rowHeight,
    font,
    bold,
    size: 21,
    align: "center",
    borderWidth: 1.2
  });
  drawGridCell(page, "", { x: sheetX + leftWidth, y: summaryTop - headerHeight - 3 * rowHeight, width: rightWidth, height: rowHeight, font, bold: font });

  [
    ["Paid Days", formatDecimal(paidDays)],
    ["LOP Days", formatDecimal(lopDays)]
  ].forEach(([label, value], index) => {
    const y = summaryTop - headerHeight - (index + 4) * rowHeight;
    drawGridCell(page, label, { x: sheetX + leftWidth, y, width: rightLabelWidth, height: rowHeight, font, bold: font, size: 9, align: "center" });
    drawGridCell(page, value, { x: sheetX + leftWidth + rightLabelWidth, y, width: rightAmountWidth, height: rowHeight, font, bold: font, size: 9, align: "center" });
  });
  drawGridCell(page, "", { x: sheetX + leftWidth, y: summaryTop - headerHeight - 6 * rowHeight, width: rightWidth, height: rowHeight, font, bold: font });
  drawGridCell(page, "Bank Name", { x: sheetX + leftWidth, y: summaryTop - headerHeight - 7 * rowHeight, width: rightLabelWidth, height: rowHeight, font, bold: font, size: 9 });
  drawGridCell(page, bankName, { x: sheetX + leftWidth + rightLabelWidth, y: summaryTop - headerHeight - 7 * rowHeight, width: rightAmountWidth, height: rowHeight, font, bold: font, size: 9, align: "center" });
  drawGridCell(page, "Bank Account Number", { x: sheetX + leftWidth, y: summaryTop - headerHeight - 8 * rowHeight, width: rightLabelWidth, height: rowHeight, font, bold: font, size: 9 });
  drawGridCell(page, row.accountNo || row.bankAccountNumber || "", {
    x: sheetX + leftWidth + rightLabelWidth,
    y: summaryTop - headerHeight - 8 * rowHeight,
    width: rightAmountWidth,
    height: rowHeight,
    font,
    bold: font,
    size: 9,
    align: "center"
  });

  const earnings = calculateEarningsBreakup(grossEarnings);
  const employeePf = 0;
  const professionalTax = 0;
  const healthInsurance = totalDeduction;
  const earningsTop = 463;
  const earningRows = [
    ["Basic Salary", formatMoney(earnings.basic), "Employee's PF", formatMoney(employeePf)],
    ["HRA", formatMoney(earnings.hra), "Professional Tax", formatMoney(professionalTax)],
    ["Conveyance Allowance", formatMoney(earnings.conveyance), "Health Insurance", formatMoney(healthInsurance)],
    ["Special Allowance", formatMoney(earnings.special), "", ""],
    ["", "", "", ""],
    ["Gross Earnings", formatMoney(earnings.gross), "Total Deductions", formatMoney(totalDeduction)]
  ];

  drawGridCell(page, "EARNINGS", { x: sheetX, y: earningsTop - headerHeight, width: labelWidth, height: headerHeight, font, bold, size: 10 });
  drawGridCell(page, "AMOUNT", { x: sheetX + labelWidth, y: earningsTop - headerHeight, width: amountWidth, height: headerHeight, font, bold, size: 10, align: "center" });
  drawGridCell(page, "DEDUCTIONS", { x: sheetX + leftWidth, y: earningsTop - headerHeight, width: rightLabelWidth, height: headerHeight, font, bold, size: 10 });
  drawGridCell(page, "AMOUNT", {
    x: sheetX + leftWidth + rightLabelWidth,
    y: earningsTop - headerHeight,
    width: rightAmountWidth,
    height: headerHeight,
    font,
    bold,
    size: 10,
    align: "center"
  });
  earningRows.forEach(([earningLabel, earningAmount, deductionLabel, deductionAmount], index) => {
    const y = earningsTop - headerHeight - (index + 1) * rowHeight;
    const isTotal = index === earningRows.length - 1;
    drawGridCell(page, earningLabel, { x: sheetX, y, width: labelWidth, height: rowHeight, font, bold: isTotal ? bold : font, size: 9 });
    drawGridCell(page, earningAmount, { x: sheetX + labelWidth, y, width: amountWidth, height: rowHeight, font, bold: isTotal ? bold : font, size: 9, align: "center" });
    drawGridCell(page, deductionLabel, { x: sheetX + leftWidth, y, width: rightLabelWidth, height: rowHeight, font, bold: isTotal ? bold : font, size: 9 });
    drawGridCell(page, deductionAmount, {
      x: sheetX + leftWidth + rightLabelWidth,
      y,
      width: rightAmountWidth,
      height: rowHeight,
      font,
      bold: isTotal ? bold : font,
      size: 9,
      align: "center"
    });
  });

  const employerTop = 314;
  const employerAmountWidth = 120;
  [
    ["Employer's PF", formatMoney(0)],
    ["EDLI", formatMoney(0)],
    ["PF Admin Charges", formatMoney(0)],
    ["Total", formatMoney(0)]
  ].forEach(([label, value], index) => {
    const y = employerTop - (index + 1) * rowHeight;
    const isTotal = index === 3;
    drawGridCell(page, label, {
      x: sheetX,
      y,
      width: sheetWidth - employerAmountWidth,
      height: rowHeight,
      font,
      bold: isTotal ? bold : font,
      size: 9,
      align: isTotal ? "right" : "left"
    });
    drawGridCell(page, value, { x: sheetX + sheetWidth - employerAmountWidth, y, width: employerAmountWidth, height: rowHeight, font, bold: isTotal ? bold : font, size: 9, align: "center" });
  });

  const canteenExpenses = Number(row.canteenExpenses) || 0;
  const netPayable = Math.max(0, earnings.gross - totalDeduction - canteenExpenses);
  const netTop = 226;
  const netAmountWidth = 120;
  drawGridCell(page, "NETPAY", { x: sheetX, y: netTop - headerHeight, width: sheetWidth - netAmountWidth, height: headerHeight, font, bold, size: 10, align: "center" });
  drawGridCell(page, "AMOUNT", { x: sheetX + sheetWidth - netAmountWidth, y: netTop - headerHeight, width: netAmountWidth, height: headerHeight, font, bold, size: 10, align: "center" });

  [
    ["Gross Earnings", formatMoney(earnings.gross)],
    ["(-) Total Deductions", formatMoney(totalDeduction)],
    ["(-) Canteen Expenses", `INR ${formatMoneyPlain(canteenExpenses)}.00`],
    ["Total Net Payable", formatMoney(netPayable)]
  ].forEach(([label, value], index) => {
    const y = netTop - headerHeight - (index + 1) * rowHeight;
    const isTotal = index === 3;
    drawGridCell(page, label, {
      x: sheetX,
      y,
      width: sheetWidth - netAmountWidth,
      height: rowHeight,
      font,
      bold: isTotal ? bold : font,
      size: 9,
      align: isTotal ? "right" : "left"
    });
    drawGridCell(page, value, { x: sheetX + sheetWidth - netAmountWidth, y, width: netAmountWidth, height: rowHeight, font, bold: isTotal ? bold : font, size: 9, align: "center" });
  });

  drawGridCell(page, "**Total Net Payable = Gross Earnings - Total Deductions - Canteen Expenses**", {
    x: sheetX,
    y: 112,
    width: sheetWidth,
    height: 20,
    font,
    bold: font,
    size: 9,
    align: "center"
  });
}

function drawLabelValue(page, { label, value, x, y, width = 240, font, bold }) {
  page.drawRectangle({
    x,
    y: y - 8,
    width,
    height: 30,
    borderColor: rgb(0.82, 0.86, 0.9),
    borderWidth: 0.8,
    color: rgb(0.98, 0.99, 1)
  });
  drawText(page, label, {
    x: x + 10,
    y: y + 8,
    size: 8,
    font,
    color: rgb(0.37, 0.43, 0.5)
  });
  drawText(page, value, {
    x: x + 10,
    y: y - 3,
    size: 10,
    font: bold,
    color: rgb(0.08, 0.12, 0.18)
  });
}

function drawTable(page, { title, rows, x, y, width, font, bold }) {
  drawText(page, title, {
    x,
    y,
    size: 12,
    font: bold,
    color: rgb(0.08, 0.12, 0.18)
  });

  let cursorY = y - 24;
  rows.forEach(([label, value], index) => {
    const fill = index % 2 === 0 ? rgb(0.98, 0.99, 1) : rgb(0.94, 0.96, 0.98);
    page.drawRectangle({
      x,
      y: cursorY - 8,
      width,
      height: 28,
      color: fill,
      borderColor: rgb(0.84, 0.87, 0.91),
      borderWidth: 0.6
    });
    drawText(page, label, {
      x: x + 10,
      y: cursorY + 2,
      size: 9,
      font,
      color: rgb(0.22, 0.28, 0.36)
    });
    drawText(page, value, {
      x: x + width - 120,
      y: cursorY + 2,
      size: 9,
      font: bold,
      color: rgb(0.08, 0.12, 0.18)
    });
    cursorY -= 28;
  });
}

async function buildSalarySlipsPdf({ rows = [], month = "Current Month" }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logoImage = null;

  try {
    const logoBytes = await readFile(payslipLogoPath);
    logoImage = await pdf.embedPng(logoBytes);
  } catch {
    logoImage = null;
  }

  rows.forEach((row) => {
    const page = pdf.addPage(pageSize);
    const [width, height] = pageSize;
    const gross = Number(row.salaryExcludingOt) || Number(row.monthlyNetPay) || 0;
    const otAmount = Number(row.otAmount) || 0;
    const total = Number(row.totalPay) || 0;
    const deductions = Math.max(0, gross + otAmount - total);

    const sheetX = 32;
    const sheetWidth = width - 64;

    page.drawRectangle({
      x: sheetX,
      y: 40,
      width: sheetWidth,
      height: height - 80,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5
    });

    page.drawRectangle({
      x: sheetX,
      y: 720,
      width: sheetWidth,
      height: 82,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5
    });
    drawText(page, "Talme Technologies Private Limited", {
      x: 54,
      y: 758,
      size: 22,
      font: bold,
      color: rgb(0, 0, 0)
    });

    if (logoImage) {
      page.drawImage(logoImage, {
        x: width - 100,
        y: 730,
        width: 56,
        height: 61
      });
    }

    page.drawRectangle({
      x: sheetX,
      y: 675,
      width: sheetWidth,
      height: 45,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5
    });
    drawCenteredText(page, "No.24 Vittal Mallya Road, Level 14, Concorde Towers, UB City, Bangalore, 560001.", {
      x: sheetX,
      y: 699,
      width: sheetWidth,
      size: 10.5,
      font: bold,
      color: rgb(0, 0, 0)
    });
    drawCenteredText(page, "Centre Name - UB City 2", {
      x: sheetX,
      y: 681,
      width: sheetWidth,
      size: 15,
      font: bold,
      color: rgb(0, 0, 0)
    });

    page.drawRectangle({
      x: sheetX,
      y: 645,
      width: sheetWidth,
      height: 30,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5
    });
    drawCenteredText(page, `Payslip for the Month of ${month}`, {
      x: sheetX,
      y: 653,
      width: sheetWidth,
      size: 15,
      font: bold,
      color: rgb(0, 0, 0)
    });

    drawPayslipBreakup(page, {
      row,
      month,
      grossEarnings: gross + otAmount,
      totalDeduction: deductions,
      font,
      bold,
      sheetX,
      sheetWidth
    });
  });

  return pdf.save();
}

export async function GET(request, { params }) {
  const resolved = await params;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(pageSize);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { searchParams } = new URL(request.url);

  if (resolved.kind === "payslip") {
    const month = searchParams.get("month") || "Current Month";
    const bytes = await buildSalarySlipsPdf({
      rows: [buildPayslipRowFromParams(searchParams)],
      month
    });

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="payslip-${safeText(month).replace(/\s+/g, "-").toLowerCase()}.pdf"`
      }
    });
  }

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

export async function POST(request, { params }) {
  const resolved = await params;

  if (!["salary-slips", "share-salary-slips"].includes(resolved.kind)) {
    return new Response("Unsupported PDF request.", { status: 404 });
  }

  const body = await request.json();
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (!rows.length) {
    return new Response("No employees found for salary slip generation.", { status: 400 });
  }

  if (resolved.kind === "share-salary-slips") {
    const result = await shareSalarySlips({
      rows,
      month: body?.month || "Current Month"
    });

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  const bytes = await buildSalarySlipsPdf({
    rows,
    month: body?.month || "Current Month"
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="salary-slips.pdf"`
    }
  });
}
