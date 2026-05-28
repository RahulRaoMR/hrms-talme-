import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const templatePath = path.join(process.cwd(), "public", "templates", "talme-offer-letter-template.pdf");
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const TABLE_BLUE = rgb(0.78, 0.86, 0.98);
const TABLE_GREEN = rgb(0.58, 0.9, 0.58);
const TABLE_YELLOW = rgb(1, 1, 0);
const TABLE_PALE_GREEN = rgb(0.88, 0.96, 0.93);
const TABLE_PALE_YELLOW = rgb(1, 0.98, 0.82);

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

function drawCenteredText(page, font, text, y, options = {}) {
  const size = options.size || 9;
  const pageWidth = page.getWidth();
  const textWidth = font.widthOfTextAtSize(String(text || ""), size);
  drawText(page, font, text, (pageWidth - textWidth) / 2, y, { ...options, size });
}

function drawWrapped(page, font, text, x, y, options = {}) {
  const size = options.size || 10;
  const maxWidth = options.maxWidth || 520;
  const lineHeight = options.lineHeight || 12;
  const words = clean(text).split(/\s+/);
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) > maxWidth && line) {
      drawText(page, font, line, x, currentY, { size, maxWidth });
      currentY -= lineHeight;
      line = word;
      return;
    }
    line = nextLine;
  });

  if (line) {
    drawText(page, font, line, x, currentY, { size, maxWidth });
    currentY -= lineHeight;
  }

  return currentY;
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
  const hraYearly = Math.round(ctc * 0.25);
  const conveyanceYearly = Math.round(ctc * 0.025);
  const communicationYearly = ctc > 720000 ? 36000 : Math.round(ctc * 0.05);
  const employeePfMonthly = Math.min(Math.round((basicYearly / 12) * 0.12), 1800);
  const employeePfYearly = employeePfMonthly * 12;
  const employerPfMonthly = employeePfMonthly;
  const employerPfYearly = employeePfYearly;
  const edliYearly = Math.round(basicYearly * 0.005);
  const epfAdminYearly = Math.round(basicYearly * 0.005);
  const employerEsiYearly = Math.round(basicYearly < 252000 ? basicYearly * 0.0325 : 0);
  const employerLwfYearly = 100;
  const employerTotalYearly = employerEsiYearly + employerPfYearly + edliYearly + epfAdminYearly + employerLwfYearly;
  const grossYearly = ctc - employerTotalYearly;
  const ltaYearly = grossYearly - basicYearly - hraYearly - conveyanceYearly - communicationYearly;
  const employeeEsiYearly = Math.round(basicYearly < 252000 ? basicYearly * 0.0075 : 0);
  const employeeLwfYearly = 50;
  const professionalTaxYearly = grossYearly / 12 > 15000 ? 2400 : 0;
  const employeeTotalYearly = employeeEsiYearly + employeePfYearly + employeeLwfYearly + professionalTaxYearly;
  const medicalInsuranceYearly = 0;
  const incomeTaxYearly = 0;
  const totalTaxesYearly = incomeTaxYearly;
  const totalDeductionsYearly = medicalInsuranceYearly;
  const netYearly = grossYearly - employeeTotalYearly - totalDeductionsYearly - totalTaxesYearly;

  return {
    ctc,
    monthlyCtc: ctc / 12,
    basic: basicYearly,
    hra: hraYearly,
    conveyance: conveyanceYearly,
    communication: communicationYearly,
    lta: ltaYearly,
    gross: grossYearly,
    employeePf: employeePfYearly,
    employeeEsi: employeeEsiYearly,
    employeeLwf: employeeLwfYearly,
    professionalTax: professionalTaxYearly,
    employeeTotal: employeeTotalYearly,
    employerPf: employerPfYearly,
    edli: edliYearly,
    epfAdmin: epfAdminYearly,
    employerEsi: employerEsiYearly,
    employerLwf: employerLwfYearly,
    employerTotal: employerTotalYearly,
    medicalInsurance: medicalInsuranceYearly,
    totalDeductions: totalDeductionsYearly,
    incomeTax: incomeTaxYearly,
    totalTaxes: totalTaxesYearly,
    net: netYearly,
    totalCompensation: ctc
  };
}

function replaceFirstPage(page, fonts, data) {
  const { regular, bold } = fonts;
  const x = 36;
  const maxWidth = 520;

  cover(page, 0, 86, 595.5, 635);

  drawText(page, regular, "Personal & Confidential", 38, 707, { size: 15 });
  drawText(page, regular, `Date: ${data.offerDate}`, 38, 691, { size: 10 });
  drawText(page, regular, "Offer of Employment", 38, 640, { size: 15 });

  drawText(page, regular, "Dear ", x, 611, { size: 10 });
  drawText(page, bold, `${data.candidateName} ,`, 60, 611, { size: 10 });

  let y = 565;
  y = drawWrapped(
    page,
    regular,
    `We are pleased to inform you that you have been selected to work at Talme Technologies as "${data.jobRole}".`,
    x,
    y,
    { size: 10, maxWidth, lineHeight: 12 }
  );
  y -= 10;
  y = drawWrapped(
    page,
    regular,
    `You are requested to join on ${data.dateOfJoining} and the offer stands Withdrawn thereafter, unless the date is extended and communicated to you In Writing.`,
    x,
    y,
    { size: 10, maxWidth, lineHeight: 12 }
  );
  y -= 8;
  y = drawWrapped(
    page,
    regular,
    "The company has full right to terminate you with or without cause, and with or without notice.",
    x,
    y,
    { size: 10, maxWidth, lineHeight: 12 }
  );
  y -= 12;
  drawText(page, regular, `Employment Type: ${data.employmentType}`, x, y, { size: 10 });
  y -= 25;
  drawText(page, regular, `Place of work: ${data.companyName}`, x, y, { size: 10 });
  y -= 25;
  y = drawWrapped(
    page,
    regular,
    "We will initiate the pre on-boarding processes and provide you any additional requirements for on boarding separately.",
    x,
    y,
    { size: 10, maxWidth, lineHeight: 12 }
  );

  drawText(page, bold, "Compensation structure;", 38, 401, { size: 10 });
  drawText(page, bold, `Your Total Cost to Company is INR Rs. ${buildCtcTail(data.ctc)}`, x, 375, { size: 10, maxWidth });
  drawText(page, bold, "The details of the compensation package offered to you are given in Annexure - A.", x, 351, { size: 10 });

  drawText(page, bold, "Terms & Conditions", x, 322, { size: 10 });
  drawText(page, bold, "1.Compensation", x, 296, { size: 10 });
  y = drawWrapped(
    page,
    regular,
    "As detailed in the above page and do not disclose the service duration and compensation details to any candidates and the customer organization. Matter of your compensation and offer letter is confidential information of the company. Any discussion or disclosure of your compensation or the contents of offer letter with anybody other than HR will be considered as breach of agreement by you.",
    x,
    266,
    { size: 10, maxWidth, lineHeight: 11 }
  );
  y -= 10;
  y = drawWrapped(
    page,
    regular,
    "*** The company reserves the right to alter the salary structure and make changes in the overall CTC to accommodate any changes in the regulatory provisions or company policies.",
    x,
    y,
    { size: 10, maxWidth, lineHeight: 11 }
  );
  y -= 12;
  drawText(page, bold, "2. Term", x, y, { size: 10 });
  drawWrapped(
    page,
    regular,
    "This Offer Letter shall be valid and binding between you and the Company from the date of execution hereof, unless terminated in accordance with the provisions of this Offer letter.",
    x,
    y - 21,
    { size: 10, maxWidth, lineHeight: 11 }
  );
}

function fixTermsOverlap(page, font) {
  const x = 38;
  const maxWidth = 486;
  const size = 8.8;
  const lineHeight = 10.5;
  let y = 342;

  cover(page, 0, 28, 595.5, 336);

  const drawTerm = (text, gap = 2.5) => {
    y = drawWrapped(page, font, text, x, y, { size, maxWidth, lineHeight });
    y -= gap;
  };

  const drawNumberedTerm = (number, text, gap = 2.5) => {
    const bodyX = x + font.widthOfTextAtSize(`${number}  `, size);
    drawText(page, font, number, x, y, { size });
    y = drawWrapped(page, font, text, bodyX, y, { size, maxWidth: maxWidth - (bodyX - x), lineHeight });
    y -= gap;
  };

  drawTerm(
    "19.4 In the event your employment is terminated by the Company for any other reason, or you terminate your employment in breach of the terms of your employment, without prejudice to any other right or remedy available to the Company under law and/or equity, the Company shall not be liable to pay any salary or any other amount to you which shall stand forfeited with immediate effect. In such an event you shall also be deemed to have unconditionally and irrevocably waived any salary or any other amount payable to and you shall not be entitled to claim damages, injunction or other reliefs or compensation for termination of this Offer Letter.",
    4
  );
  drawTerm("19.5 Upon termination of this Offer Letter:", 2);
  drawNumberedTerm(
    "19.5.1",
    "Please adhere to the requirements of the exit process in terms of settling all claims. You will also need to surrender all the tangible assets of the Company, including the data and information both in soft and hard copies which are in your possession by virtue of your employment before separation from the Company.",
    3
  );
  drawNumberedTerm(
    "19.5.2",
    "You shall extend requisite co-operation to the Company and/or its affiliates to ensure smooth transition of your duties and responsibilities to such person as may be nominated/appointed by the Company and/or affiliates.",
    3
  );
  drawTerm("19.6 At the termination of your employment with the Company and/or its affiliates, you shall not at any time:", 2);
  drawNumberedTerm("19.6.1", "make any untrue or misleading statements in relation to the Company and/or its affiliates;", 2);
  drawNumberedTerm(
    "19.6.2",
    "make any statement to any person which may, or is likely to, adversely affect the business or reputation of the Company; represent yourself as being directly or indirectly associated with or interested in the business of the Company and/or its affiliates;",
    0
  );
}

function fixUpperTerminationClauses(page, font, bold) {
  const x = 38;
  const maxWidth = 500;
  const size = 9.2;
  const lineHeight = 11.3;
  let y = 474;

  cover(page, 0, 314, 595.5, 174);

  const drawRomanTerm = (number, text, gap = 8) => {
    const bodyX = x + font.widthOfTextAtSize(`${number}  `, size);
    drawText(page, bold, number, x, y, { size });
    y = drawWrapped(page, font, text, bodyX, y, { size, maxWidth: maxWidth - (bodyX - x), lineHeight });
    y -= gap;
  };

  drawRomanTerm(
    "iv.",
    "have willfully or intentionally acted in any way, with the intent to harm the Company, that has a direct, substantial and material adverse effect on the business or reputation of the Company;",
    6
  );
  drawRomanTerm(
    "v.",
    "are restricted in any manner (regardless of the extent, context, and validity of such restrictions) from conducting or engaging in the business of the Company by any court of competent jurisdiction;",
    6
  );
  drawRomanTerm("vi.", "provide any inaccurate representations or commit a material breach of any of the provisions of this Offer Letter;", 8);
  drawRomanTerm("vii.", "failed to remedy any breach notified by the Company; or", 8);
  drawRomanTerm("viii.", "otherwise act in a manner that is damaging to the Company's reputation.", 0);
}

function replaceAcceptancePage(page, font, data) {
  replaceText(page, font, `Date: ${data.acceptanceDate || ""}`, 37, 505, 220, 20, { size: 10 });
  replaceText(page, font, `Place: ${data.workLocation || ""}`, 36, 456, 220, 20, { size: 10 });
  replaceText(page, font, `Name: ${data.candidateName}`, 35, 312, 280, 20, { size: 10 });
}

function replacePolicyPage(page, fonts, data) {
  const { regular, bold } = fonts;
  const x = 38;
  const maxWidth = 520;
  const headingSize = 10;
  const bodySize = 9.7;
  const lineHeight = 12;
  let y = 710;

  cover(page, 0, 64, page.getWidth(), 686);

  const heading = (text, gapBefore = 0) => {
    y -= gapBefore;
    drawText(page, bold, text, x, y, { size: headingSize });
    y -= 14;
  };
  const body = (text, gapAfter = 10) => {
    y = drawWrapped(page, regular, text, x, y, { size: bodySize, maxWidth, lineHeight });
    y -= gapAfter;
  };
  const boldLine = (text, gapAfter = 0) => {
    drawText(page, bold, text, x, y, { size: bodySize });
    y -= lineHeight + gapAfter;
  };

  heading("9. Contact information");
  body("You will keep the company informed of your postal address, telephone number, fax, email or any other means for communication including changes that may occur during the period of your employment. Any communication sent to the last informed address is deemed as served.", 9);

  heading("10. Working Hours");
  boldLine(`Monday to Friday: ${data.weekdayShiftTiming}`);
  boldLine(`Saturday: ${data.saturdayShiftTiming}`, 0);
  body("Company reserves the right to run the shifts, change the shift timings, fix the criteria to attend in shifts within the applicable laws based on its business needs and all its employees are bound by it.", 9);

  heading("11. Leave & Holidays");
  body("Employees are entitled to a maximum of one and a half (1.5) days of leave per month, subject to proper written approval from Talme. Unused leave cannot be carried forward to subsequent months and any unused paid leave cannot be claimed or cashed in.", 9);

  heading("12. Voluntary Abandonment");
  body("You agree that all/any unplanned/unauthorized leave for 5 (five) or more consecutive working days without prior intimation will be deemed as \"Abandonment of Services\" unless such unplanned leave is for the reasons of medical emergency which shall be substantiated with valid documentary proof within 7 (seven) days from the date of such absence. You shall not be entitled to any monetary and non-monetary benefits as was applicable to you. This provision shall also be applicable to all/any such unplanned/unauthorized leave during your serving the notice period, if any. You shall also not be entitled to any monetary and non-monetary benefits in case of your resignation and you do not serve the agreed notice period as directed by the Company.", 9);

  heading("13. Insurance / Medical Examination");
  body("The insurance policy will take up to 30 working days from your date of joining to be generated. Details regarding the insurance plan and coverage will be provided upon activation. The company reserves its right to have you undergo medical examination from time to time. The appointment shall at all times be subject to a doctor certifying you to be fit to carry out your duties.", 9);

  heading("14. Dress Code");
  body("You are required to be dressed in Business Formals on Weekdays and Business Informal is permitted on Friday. Gentlemen: To be dressed in full/half sleeved shirt, Full Trousers and Leather Shoes (Black or Brown). Ladies: Saree's / Salwar Kameez / Business Suits / Full or half sleeved shirt, Full Trousers.", 9);

  heading("15. Performance Review");
  body("You shall receive periodic performance reviews/evaluations at the discretion of the Company.", 6);

  heading("16. Compensation Reviews");
  body("Compensation reviews shall be purely based on individual's profile, contributions, competencies, role, potential to shoulder higher responsibilities and internal & external environment. Compensation reviews are highly personal and confidential and hence, revealing or eliciting compensation details is considered as impropriety and may lead to punitive action.", 9);

  heading("17. Travel & Facility");
  body("No cab facility and food facility will be provided by Talme.", 6);

  drawText(page, bold, "A.  Canteen Policy", x, y, { size: headingSize });
  y -= 11;
  body("Canteen charges will be deducted from the employee's Cost to Company (CTC) as part of the overall benefits and amenities provided by the organization. This deduction will be reflected in the monthly salary statement.", 9);

  heading("18. Associate's Non-Disclosure agreement");
  body("You will need to keep all information pertaining to Talme Technologies and its subsidiaries, customers and all stakeholders confidential.", 0);
}

function drawAnnexureTable(page, fonts, data) {
  const { regular, bold } = fonts;
  const values = calculateAnnexure(data.ctc);
  const x = 24;
  const top = 674;
  const rowHeight = 15;
  const widths = [165, 190, 76, 88];
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  const colX = [x, x + widths[0], x + widths[0] + widths[1], x + widths[0] + widths[1] + widths[2], x + tableWidth];
  const communicationReason = values.ctc > 720000 ? "36000 fixed for CTC > 7.2 LPA" : "5% for CTC <= 7.2 LPA";
  const rows = [
    ["Annual CTC", "", `Rs. ${formatAmount(values.ctc)}`, "", "input"],
    ["Monthly CTC", "", `Rs. ${formatAmount(values.monthlyCtc)}`, "", ""],
    ["State for PT", "", "1", "", "input"],
    ["", "", "", "", "blank"],
    ["Salary Component", "Reason", "Monthly", "Yearly", "header"],
    ["Earnings", "", "", "", "section"],
    ["Basic", "50%", `Rs. ${formatAmount(values.basic / 12)}`, `Rs. ${formatAmount(values.basic)}`, "reason"],
    ["HRA", "25%", `Rs. ${formatAmount(values.hra / 12)}`, `Rs. ${formatAmount(values.hra)}`, "reason"],
    ["Conveyance / Fuel Allowance", "2.50%", `Rs. ${formatAmount(values.conveyance / 12)}`, `Rs. ${formatAmount(values.conveyance)}`, "reason"],
    ["Communication Allowance", communicationReason, `Rs. ${formatAmount(values.communication / 12)}`, `Rs. ${formatAmount(values.communication)}`, "reason"],
    ["LTA (Leave & Travel Allowance)", "Balancing figure", `Rs. ${formatAmount(values.lta / 12)}`, `Rs. ${formatAmount(values.lta)}`, ""],
    ["", "", "", "", "blank"],
    ["Gross pay", "", `Rs. ${formatAmount(values.gross / 12)}`, `Rs. ${formatAmount(values.gross)}`, "total"],
    ["", "", "", "", "blank"],
    ["Employee Statutories", "", "", "", "section"],
    ["Employee's Contribution to ESIC", "0.75% if Basic less than 21000", `Rs. ${formatAmount(values.employeeEsi / 12)}`, `Rs. ${formatAmount(values.employeeEsi)}`, ""],
    ["Employee's Contribution to PF", "12% of the basic with upper cap at 1800", `Rs. ${formatAmount(values.employeePf / 12)}`, `Rs. ${formatAmount(values.employeePf)}`, ""],
    ["Employee's Contribution to LWF", "Total 50 in a year", `Rs. ${formatAmount(values.employeeLwf / 12)}`, `Rs. ${formatAmount(values.employeeLwf)}`, ""],
    ["KA Professional Tax", "", `Rs. ${formatAmount(values.professionalTax / 12)}`, `Rs. ${formatAmount(values.professionalTax)}`, ""],
    ["Total Employee Statutories", "", `Rs. ${formatAmount(values.employeeTotal / 12)}`, `Rs. ${formatAmount(values.employeeTotal)}`, "total"],
    ["", "", "", "", "blank"],
    ["Employer Statutories", "", "", "", "section"],
    ["Employer's Contribution to ESIC", "3.25% if basic less than 21000", `Rs. ${formatAmount(values.employerEsi / 12)}`, `Rs. ${formatAmount(values.employerEsi)}`, ""],
    ["Employer's Contribution to PF", "12% of basic", `Rs. ${formatAmount(values.employerPf / 12)}`, `Rs. ${formatAmount(values.employerPf)}`, ""],
    ["EDLI - Employer Contribution", "0.5% of the basic", `Rs. ${formatAmount(values.edli / 12)}`, `Rs. ${formatAmount(values.edli)}`, ""],
    ["EPF Admin Charges", "0.5% of the basic", `Rs. ${formatAmount(values.epfAdmin / 12)}`, `Rs. ${formatAmount(values.epfAdmin)}`, ""],
    ["Employer's Contribution to LWF", "Total 100 in a year", `Rs. ${formatAmount(values.employerLwf / 12)}`, `Rs. ${formatAmount(values.employerLwf)}`, ""],
    ["Total Employer Statutories", "", `Rs. ${formatAmount(values.employerTotal / 12)}`, `Rs. ${formatAmount(values.employerTotal)}`, "total"],
    ["", "", "", "", "blank"],
    ["Deductions", "", "", "", "section"],
    ["Medical Insurance", "", `Rs. ${formatAmount(values.medicalInsurance / 12)}`, `Rs. ${formatAmount(values.medicalInsurance)}`, ""],
    ["Total Deductions", "", `Rs. ${formatAmount(values.totalDeductions / 12)}`, `Rs. ${formatAmount(values.totalDeductions)}`, "total"],
    ["", "", "", "", "blank"],
    ["TDS", "", "", "", "section"],
    ["Income tax", "", `Rs. ${formatAmount(values.incomeTax / 12)}`, `Rs. ${formatAmount(values.incomeTax)}`, ""],
    ["Total Taxes", "", `Rs. ${formatAmount(values.totalTaxes / 12)}`, `Rs. ${formatAmount(values.totalTaxes)}`, "total"],
    ["", "", "", "", "blank"],
    ["Net Pay", "", `Rs. ${formatAmount(values.net / 12)}`, `Rs. ${formatAmount(values.net)}`, "net"]
  ];

  cover(page, 18, 88, 560, 600);

  rows.forEach((row, index) => {
    const y = top - (index + 1) * rowHeight;
    const fill =
      row[4] === "header" ? TABLE_BLUE :
        row[4] === "net" ? TABLE_GREEN :
          row[4] === "total" ? TABLE_PALE_GREEN :
            row[4] === "reason" ? TABLE_YELLOW :
              row[4] === "input" ? TABLE_PALE_YELLOW :
                null;
    if (fill) page.drawRectangle({ x, y, width: tableWidth, height: rowHeight, color: fill });
  });

  for (let i = 0; i <= rows.length; i += 1) {
    const y = top - i * rowHeight;
    drawLine(page, x, y, x + tableWidth, y);
  }
  colX.forEach((lineX) => drawLine(page, lineX, top, lineX, top - rows.length * rowHeight));

  rows.forEach((row, index) => {
    if (row[4] === "blank") return;
    const baseline = top - (index + 1) * rowHeight + 4.3;
    const rowFont = ["header", "net"].includes(row[4]) ? bold : regular;
    drawText(page, rowFont, row[0], x + 4, baseline, { size: 6.7, maxWidth: widths[0] - 8 });
    drawText(page, rowFont, row[1], colX[1] + 4, baseline, { size: 6.7, maxWidth: widths[1] - 8 });
    drawText(page, rowFont, row[2], colX[2] + 4, baseline, { size: 6.7, maxWidth: widths[2] - 8 });
    drawText(page, rowFont, row[3], colX[3] + 4, baseline, { size: 6.7, maxWidth: widths[3] - 8 });
  });
}

function drawAddressFooter(page, font, options = {}) {
  const firstLineY = options.firstLineY || 30;
  const secondLineY = options.secondLineY || 19;
  if (options.cover !== false) {
    cover(page, 0, Math.max(0, secondLineY - 11), page.getWidth(), firstLineY - secondLineY + 24);
  }
  drawCenteredText(
    page,
    font,
    "Level 14, Concorde Towers, UB City, No.24 Vittal Mallya Road, Bangalore, Karnataka, 560001, India. Centre Name - UB City",
    firstLineY,
    { size: 8.2 }
  );
  drawCenteredText(
    page,
    font,
    "Email: hr@talme.in          Phone: +91 94818 38000 | +91 97318 38000          Website: www.talme.in",
    secondLineY,
    { size: 8.2 }
  );
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
    acceptanceDate: clean(data.acceptanceDate),
    weekdayShiftTiming: clean(data.weekdayShiftTiming) || "08:00 AM to 5:30 PM",
    saturdayShiftTiming: clean(data.saturdayShiftTiming) || "08:00 AM to 12:00 PM"
  };

  if (pages[0]) replaceFirstPage(pages[0], { regular, bold }, payload);
  if (pages[2]) replacePolicyPage(pages[2], { regular, bold }, payload);
  if (pages[3]) {
    fixUpperTerminationClauses(pages[3], regular, bold);
    fixTermsOverlap(pages[3], regular);
    drawAddressFooter(pages[3], tableRegular, { firstLineY: 54, secondLineY: 43, cover: false });
  }
  if (pages[6]) replaceAcceptancePage(pages[6], regular, payload);
  if (pages[7]) {
    drawAnnexureTable(pages[7], { regular: tableRegular, bold: tableBold }, payload);
    drawAddressFooter(pages[7], tableRegular);
  }

  const bytes = await pdfDoc.save();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${candidateName || "talme"}-offer-letter.pdf"`
    }
  });
}
