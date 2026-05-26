import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const templatePath = path.join(process.cwd(), "public", "templates", "talme-offer-letter-template.pdf");
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

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

function formatMonthly(value) {
  const rounded = Math.round(value || 0);
  return Number.isInteger(value) ? formatAmount(rounded) : formatAmount(rounded);
}

function numberToIndianWords(value) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const units = [
    ["Crore", 10000000],
    ["Lakh", 100000],
    ["Thousand", 1000],
    ["Hundred", 100]
  ];

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

function buildCtcLine(ctcValue) {
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
    rows: {
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
    }
  };
}

function drawAnnexureAmount(page, font, yearly, y) {
  cover(page, 271, y - 2, 70, 18);
  cover(page, 363, y - 2, 80, 18);
  drawText(page, font, formatMonthly(yearly / 12), 271.8, y + 0.8, { size: 12 });
  drawText(page, font, formatAmount(yearly), 363.3, y + 0.8, { size: 12 });
}

function replaceFirstPage(page, fonts, data) {
  const { regular, bold } = fonts;

  replaceText(page, regular, `Date: ${data.offerDate}`, 36, 688, 210, 20, { size: 10 });
  replaceText(page, bold, `${data.candidateName} ,`, 58, 607, 280, 20, { size: 10 });
  replaceText(page, regular, `“${data.jobRole}”`, 405, 560, 150, 18, { size: 10 });
  replaceText(page, regular, clean(data.dateOfJoining), 150, 538, 75, 20, { size: 10 });
  replaceText(page, regular, `Employment Type: ${data.employmentType}`, 34, 481, 250, 18, { size: 10 });
  replaceText(page, regular, `Place of work: ${data.companyName}`, 34, 456, 260, 18, { size: 10 });
  replaceText(page, regular, buildCtcLine(data.ctc), 197, 371, 355, 18, { size: 10 });
}

function replaceAcceptancePage(page, font, data) {
  replaceText(page, font, `Date: ${data.acceptanceDate || ""}`, 37, 505, 220, 20, { size: 10 });
  replaceText(page, font, `Place: ${data.workLocation || ""}`, 36, 456, 220, 20, { size: 10 });
  replaceText(page, font, `Name: ${data.candidateName}`, 35, 312, 280, 20, { size: 10 });
}

function replaceAnnexure(page, fonts, data) {
  const { regular, bold } = fonts;
  const annexure = calculateAnnexure(data.ctc);
  const rows = annexure.rows;
  const rowY = {
    basic: 576.5,
    hra: 556.9,
    conveyance: 537.3,
    special: 517.6,
    gross: 498,
    employeePf: 452.8,
    employeeEsi: 433.2,
    professionalTax: 413.5,
    employeeTotal: 393.9,
    net: 374.3,
    employerPf: 329.1,
    edli: 309.4,
    epfAdmin: 289.8,
    employerEsi: 270.2,
    employerTotal: 250.5,
    totalCompensation: 230.9
  };

  cover(page, 271, 634, 80, 18);
  cover(page, 271, 226, 70, 390);
  cover(page, 363, 226, 80, 390);
  cover(page, 258, 653, 190, 18);
  drawText(page, bold, data.candidateName, 262.1, 657.1, { size: 12 });
  drawText(page, regular, formatAmount(annexure.ctc), 271.8, 639.3, { size: 12 });

  Object.entries(rowY).forEach(([key, y]) => {
    drawAnnexureAmount(page, regular, rows[key], y - 0.8);
  });
}

export async function POST(request) {
  const data = await request.json().catch(() => ({}));
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const annexureRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const annexureBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
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
  if (pages[6]) replaceAcceptancePage(pages[6], regular, payload);
  if (pages[7]) replaceAnnexure(pages[7], { regular: annexureRegular, bold: annexureBold }, payload);

  const bytes = await pdfDoc.save();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${candidateName || "talme"}-offer-letter.pdf"`
    }
  });
}
