import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const templatePath = path.join(process.cwd(), "public", "templates", "talme-offer-letter-template.pdf");
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const TABLE_BLUE = rgb(0.47, 0.78, 0.9);
const TABLE_GREEN = rgb(0.58, 0.9, 0.58);

function clean(value) {
  return String(value || "").trim();
}

function joinDayAndDate(day, date) {
  return [clean(day), clean(date)].filter(Boolean).join(", ");
}

function amountFrom(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function numberToIndianWords(value) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const units = [["Crore", 10000000], ["Lakh", 100000], ["Thousand", 1000], ["Hundred", 100]];

  function belowHundred(number) {
    if (number < 20) return ones[number];
    return [tens[Math.floor(number / 10)], ones[number % 10]].filter(Boolean).join(" ");
  }

  let number = Math.round(Number(value) || 0);
  if (!number) return "Zero";

  const parts = [];
  for (const [label, size] of units) {
    const count = Math.floor(number / size);
    if (count) {
      parts.push(`${belowHundred(count)} ${label}`);
      number %= size;
    }
  }
  if (number) parts.push(belowHundred(number));
  return parts.join(" ");
}

function drawText(page, font, text, x, y, options = {}) {
  const value = String(text || "");
  if (!value) return;
  page.drawText(value, {
    x,
    y,
    size: options.size || 10,
    font,
    color: options.color || BLACK,
    maxWidth: options.maxWidth
  });
}

function drawLine(page, x1, y1, x2, y2) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 1,
    color: BLACK
  });
}

function cover(page, x, y, width, height) {
  page.drawRectangle({ x, y, width, height, color: WHITE, opacity: 1 });
}

function replaceText(page, font, text, x, y, width, height, options = {}) {
  cover(page, x, y, width, height);
  drawText(page, font, text, x, y + (options.offsetY || 2), {
    size: options.size || 10,
    maxWidth: width - 2
  });
}

function buildCtcTail(ctcValue) {
  const amount = amountFrom(ctcValue);
  if (!amount) return clean(ctcValue);
  return `${formatAmount(amount)}/- (${numberToIndianWords(amount)} Only) per annum.`;
}

function calculateAnnexure(ctcValue) {
  const ctc = amountFrom(ctcValue);
  const basicYearly = Math.round(ctc * 0.5);
  const hraYearly = Math.round(basicYearly * 0.5);
  const conveyanceYearly = Math.round(basicYearly * 0.0833);
  const pfWageYearly = Math.min(basicYearly, 180000);
  const pfYearly = Math.round(pfWageYearly * 0.12);
  const edliYearly = Math.round(pfWageYearly * 0.005);
  const epfAdminYearly = Math.round(pfWageYearly * 0.005);
  const employerTotalYearly = pfYearly + edliYearly + epfAdminYearly;
  const grossYearly = ctc - employerTotalYearly;
  const specialYearly = grossYearly - basicYearly - hraYearly - conveyanceYearly;
  const employeeEsiYearly = Math.round(grossYearly * 0.0075);
  const professionalTaxYearly = Math.round(grossYearly / 12) > 25000 ? 2400 : 0;
  const employeeTotalYearly = pfYearly + employeeEsiYearly + professionalTaxYearly;
  const netYearly = grossYearly - employeeTotalYearly;
  const employerEsiYearly = Math.round(grossYearly * 0.0325);

  return {
    ctc,
    basic: basicYearly,
    hra: hraYearly,
    conveyance: conveyanceYearly,
    special: specialYearly,
    gross: grossYearly,
    employeePf: pfYearly,
    employeeEsi: employeeEsiYearly,
    professionalTax: professionalTaxYearly,
    employeeTotal: employeeTotalYearly,
    net: netYearly,
    employerPf: pfYearly,
    edli: edliYearly,
    epfAdmin: epfAdminYearly,
    employerEsi: employerEsiYearly,
    employerTotal: employerTotalYearly,
    totalCompensation: ctc
  };
}

function replaceFirstPage(page, fonts, data) {
  const { regular, bold } = fonts;

  replaceText(page, regular, `Date: ${data.offerDate}`, 36, 688, 210, 20, { size: 10 });
  replaceText(page, bold, `${data.candidateName} ,`, 62, 607, 280, 20, { size: 10 });
  replaceText(page, regular, `"${data.jobRole}"`, 405, 560, 150, 18, { size: 10 });
  replaceText(page, regular, clean(data.dateOfJoining), 150, 538, 75, 20, { size: 10 });
  replaceText(page, regular, `Employment Type: ${data.employmentType}`, 34, 481, 250, 18, { size: 10 });
  replaceText(page, regular, `Place of work: ${data.companyName}`, 34, 456, 260, 18, { size: 10 });
  replaceText(page, regular, buildCtcTail(data.ctc), 210, 371, 340, 18, { size: 10 });
}

function fixFooterOverlap(page, font) {
  cover(page, 70, 36, 500, 32);
  drawText(page, font, "19.6.2 make any statement to any person which may, or is likely to, adversely affect the business or reputation of the Company;", 38, 64, { size: 8.8, maxWidth: 520 });
  drawText(page, font, "represent yourself as being directly or indirectly associated with or interested in the business of the Company and/or its affiliates;", 38, 51, { size: 8.8, maxWidth: 520 });
}

function replaceAcceptancePage(page, font, data) {
  replaceText(page, font, `Date: ${data.acceptanceDate || ""}`, 37, 505, 220, 20, { size: 10 });
  replaceText(page, font, `Place: ${data.workLocation || ""}`, 36, 456, 220, 20, { size: 10 });
  replaceText(page, font, `Name: ${data.candidateName}`, 35, 312, 280, 20, { size: 10 });
}

function drawAnnexureTable(page, fonts, data) {
  const { regular, bold } = fonts;
  const values = calculateAnnexure(data.ctc);
  const x = 30;
  const top = 675;
  const rowHeight = 20;
  const widths = [190, 86, 128];
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  const colX = [x, x + widths[0], x + widths[0] + widths[1], x + tableWidth];
  const rows = [
    ["Name", data.candidateName, "", "bold"],
    ["Candidate's CTC", `Rs. ${formatAmount(values.ctc)}`, "", ""],
    ["Salary Component", "Monthly", "Yearly", "header"],
    ["Earnings", "", "", ""],
    ["Basic", `Rs. ${formatAmount(values.basic / 12)}`, `Rs. ${formatAmount(values.basic)}`, ""],
    ["HRA", `Rs. ${formatAmount(values.hra / 12)}`, `Rs. ${formatAmount(values.hra)}`, ""],
    ["Conveyance Allowance", `Rs. ${formatAmount(values.conveyance / 12)}`, `Rs. ${formatAmount(values.conveyance)}`, ""],
    ["Special Allowance", `Rs. ${formatAmount(values.special / 12)}`, `Rs. ${formatAmount(values.special)}`, ""],
    ["Total Gross Pay", `Rs. ${formatAmount(values.gross / 12)}`, `Rs. ${formatAmount(values.gross)}`, "header"],
    ["Employee Contribution", "", "", ""],
    ["Employee's Contribution to PF", `Rs. ${formatAmount(values.employeePf / 12)}`, `Rs. ${formatAmount(values.employeePf)}`, ""],
    ["Esi", `Rs. ${formatAmount(values.employeeEsi / 12)}`, `Rs. ${formatAmount(values.employeeEsi)}`, ""],
    ["KA Professional Tax", `Rs. ${formatAmount(values.professionalTax / 12)}`, `Rs. ${formatAmount(values.professionalTax)}`, ""],
    ["Total", `Rs. ${formatAmount(values.employeeTotal / 12)}`, `Rs. ${formatAmount(values.employeeTotal)}`, ""],
    ["Net Pay", `Rs. ${formatAmount(values.net / 12)}`, `Rs. ${formatAmount(values.net)}`, "net"],
    ["Employer Contribution", "", "", ""],
    ["Employer Contribution to PF", `Rs. ${formatAmount(values.employerPf / 12)}`, `Rs. ${formatAmount(values.employerPf)}`, ""],
    ["EDLI - Employer Contribution", `Rs. ${formatAmount(values.edli / 12)}`, `Rs. ${formatAmount(values.edli)}`, ""],
    ["EPF Admin Charges", `Rs. ${formatAmount(values.epfAdmin / 12)}`, `Rs. ${formatAmount(values.epfAdmin)}`, ""],
    ["ESI", `Rs. ${formatAmount(values.employerEsi / 12)}`, `Rs. ${formatAmount(values.employerEsi)}`, ""],
    ["Total", `Rs. ${formatAmount(values.employerTotal / 12)}`, `Rs. ${formatAmount(values.employerTotal)}`, ""],
    ["Total Compensation", `Rs. ${formatAmount(values.totalCompensation / 12)}`, `Rs. ${formatAmount(values.totalCompensation)}`, "header"]
  ];

  cover(page, 26, 218, 420, 470);

  rows.forEach((row, index) => {
    const y = top - (index + 1) * rowHeight;
    const fill = row[3] === "header" ? TABLE_BLUE : row[3] === "net" ? TABLE_GREEN : null;
    if (fill) page.drawRectangle({ x, y, width: tableWidth, height: rowHeight, color: fill });
  });

  for (let i = 0; i <= rows.length; i += 1) {
    const y = top - i * rowHeight;
    drawLine(page, x, y, x + tableWidth, y);
  }
  colX.forEach((lineX) => drawLine(page, lineX, top, lineX, top - rows.length * rowHeight));

  rows.forEach((row, index) => {
    const baseline = top - (index + 1) * rowHeight + 6;
    const rowFont = row[3] === "bold" ? bold : regular;
    drawText(page, rowFont, row[0], x + 5, baseline, { size: 11, maxWidth: widths[0] - 10 });
    drawText(page, rowFont, row[1], colX[1] + 5, baseline, { size: 11, maxWidth: widths[1] - 10 });
    drawText(page, rowFont, row[2], colX[2] + 8, baseline, { size: 11, maxWidth: widths[2] - 12 });
  });
}

export async function POST(request) {
  const data = await request.json().catch(() => ({}));
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const tableRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const tableBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const candidateName = clean(data.candidateName);
  const payload = {
    candidateName,
    jobRole: clean(data.jobRole),
    companyName: clean(data.companyName),
    offerDate: joinDayAndDate(data.offerDay, data.offerDate),
    dateOfJoining: clean(data.dateOfJoining),
    employmentType: clean(data.employmentType),
    workLocation: clean(data.workLocation),
    ctc: clean(data.ctc),
    acceptanceDate: clean(data.acceptanceDate)
  };

  if (pages[0]) replaceFirstPage(pages[0], { regular, bold }, payload);
  if (pages[3]) fixFooterOverlap(pages[3], regular);
  if (pages[6]) replaceAcceptancePage(pages[6], regular, payload);
  if (pages[7]) drawAnnexureTable(pages[7], { regular: tableRegular, bold: tableBold }, payload);

  const bytes = await pdfDoc.save();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${candidateName || "talme"}-offer-letter.pdf"`
    }
  });
}
