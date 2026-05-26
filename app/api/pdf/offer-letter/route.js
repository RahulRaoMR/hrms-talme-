import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const templatePath = path.join(process.cwd(), "public", "templates", "talme-offer-letter-template.pdf");

function clean(value) {
  return String(value || "").trim();
}

function joinDayAndDate(day, date) {
  return [clean(day), clean(date)].filter(Boolean).join(", ");
}

function drawReplacement(page, font, text, x, y, options = {}) {
  const value = clean(text);
  if (!value) return;

  const size = options.size || 10;
  const width = options.width || Math.max(font.widthOfTextAtSize(value, size) + 8, 90);
  const height = options.height || size + 6;

  page.drawRectangle({
    x: x - 2,
    y: y - 2,
    width,
    height,
    color: rgb(1, 1, 1),
    opacity: options.opacity ?? 0.96
  });
  page.drawText(value, {
    x,
    y,
    size,
    font,
    color: rgb(0.05, 0.06, 0.08),
    maxWidth: width - 4
  });
}

function drawLine(page, font, text, x, y, options = {}) {
  page.drawText(clean(text), {
    x,
    y,
    size: options.size || 8,
    font,
    color: rgb(0, 0, 0),
    maxWidth: options.maxWidth
  });
}

function drawTextParts(page, parts, x, y, options = {}) {
  const size = options.size || 10;
  let cursorX = x;

  parts.forEach((part) => {
    const text = String(part.text || "");
    if (!text) return;

    page.drawText(text, {
      x: cursorX,
      y,
      size,
      font: part.font,
      color: rgb(0, 0, 0)
    });
    cursorX += part.font.widthOfTextAtSize(text, size);
  });
}

function drawWrapped(page, font, text, x, y, options = {}) {
  const size = options.size || 8;
  const maxWidth = options.maxWidth || 505;
  const lineHeight = options.lineHeight || size + 2.4;
  const words = clean(text).split(/\s+/);
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) > maxWidth && line) {
      drawLine(page, font, line, x, currentY, { size, maxWidth });
      currentY -= lineHeight;
      line = word;
      return;
    }
    line = nextLine;
  });

  if (line) {
    drawLine(page, font, line, x, currentY, { size, maxWidth });
    currentY -= lineHeight;
  }

  return currentY;
}

function redrawFirstPageBody(page, fonts, data) {
  const { regular, bold } = fonts;
  const x = 34;
  let y = 690;
  const maxWidth = 525;

  page.drawRectangle({
    x: 0,
    y: 72,
    width: 595.5,
    height: 650,
    color: rgb(1, 1, 1),
    opacity: 1
  });

  drawLine(page, regular, "Personal & Confidential", x, y, { size: 16 });
  y -= 30;
  drawLine(page, regular, `Date: ${data.offerDate}`, x, y, { size: 10.5 });
  y -= 38;

  drawLine(page, regular, "Offer of Employment", x, y, { size: 16 });
  y -= 31;
  drawTextParts(
    page,
    [
      { text: "Dear ", font: regular },
      { text: data.candidateName, font: bold },
      { text: ",", font: regular }
    ],
    x,
    y,
    { size: 10.5 }
  );
  y -= 31;

  y = drawWrapped(
    page,
    regular,
    `We are pleased to inform you that you have been selected to work at Talme Technologies as "${data.jobRole}".`,
    x,
    y,
    { size: 10.2, maxWidth, lineHeight: 13.5 }
  );

  y -= 8;
  y = drawWrapped(
    page,
    regular,
    `You are requested to join on ${data.joining} and the offer stands Withdrawn thereafter, unless the date is extended and communicated to you In Writing.`,
    x,
    y,
    { size: 10.2, maxWidth, lineHeight: 13.5 }
  );

  y -= 8;
  y = drawWrapped(
    page,
    regular,
    `The company has full right to terminate you with or without cause, and with or without notice. You will be paid with a monthly salary of ${data.monthlySalary}.`,
    x,
    y,
    { size: 10.2, maxWidth, lineHeight: 13.5 }
  );

  y -= 10;
  drawLine(page, regular, `Employment Type: ${data.employmentType}`, x, y, { size: 10.2 });
  y -= 12;
  drawLine(page, regular, `Place of work: ${data.companyName}`, x, y, { size: 10.2 });
  y -= 28;
  y = drawWrapped(
    page,
    regular,
    "We will initiate the pre-onboarding processes and provide you any additional requirements for onboarding separately.",
    x,
    y,
    { size: 10.2, maxWidth, lineHeight: 13.5 }
  );

  y -= 16;
  drawLine(page, bold, "Compensation structure;", x, y, { size: 10.8 });
  y -= 32;

  y = drawWrapped(
    page,
    bold,
    `Your Total Cost to Company is ${data.ctc}. The details of the compensation package offered to you are given in Annexure - A.`,
    x,
    y,
    { size: 10.3, maxWidth, lineHeight: 13.6 }
  );

  y -= 24;
  drawLine(page, bold, "Terms & Conditions", x, y, { size: 10.8 });
  y -= 20;
  drawLine(page, bold, "1. Compensation", x, y, { size: 10.4 });
  y -= 15;
  y = drawWrapped(
    page,
    regular,
    "As detailed in the above page and do not disclose the service duration and compensation details to any candidates and the customer organization. Matter of your compensation and offer letter is confidential information of the company. Any discussion or disclosure of your compensation or the contents of offer letter with anybody other than HR will be considered as breach of agreement by you.",
    x,
    y,
    { size: 9.1, maxWidth, lineHeight: 12.4 }
  );
  y -= 9;
  drawWrapped(
    page,
    regular,
    "*** The company reserves the right to alter the salary structure and make changes in the overall CTC to accommodate any changes in the regulatory provisions or company policies.",
    x,
    y,
    { size: 9.1, maxWidth, lineHeight: 12.4 }
  );
}

function drawTermSection(page, fonts, number, title, body, x, y) {
  const { regular, bold } = fonts;
  drawLine(page, bold, `${number}. ${title}`, x, y, { size: 9.2 });
  y -= 13;

  body.forEach((paragraph) => {
    y = drawWrapped(page, regular, paragraph, x, y, {
      size: 8.55,
      maxWidth: 515,
      lineHeight: 12.4
    });
    y -= 7;
  });

  return y - 5;
}

function redrawSecondPageTerms(page, fonts) {
  const x = 34;
  let y = 697;

  page.drawRectangle({
    x: 0,
    y: 70,
    width: 595.5,
    height: 650,
    color: rgb(1, 1, 1),
    opacity: 1
  });

  y = drawTermSection(page, fonts, "2", "Term", [
    "A) This Offer Letter shall be valid and binding between you and the Company from the date of execution hereof, unless terminated in accordance with the provisions of this Offer letter.",
    "Your employment is aligned to client project requirements. Continuation of employment is subject to project continuity, extension or successful redeployment within Talme Technologies.",
    "B) Project Alignment & Continuity - Your role is currently aligned to a specific client project. In the event of project completion, ramp-down or non-extension, Talme Technologies will make reasonable efforts to redeploy you to another suitable project. If redeployment is not feasible within a reasonable period, the Company reserves the right to terminate employment in accordance with the termination clause.",
    "This employment is co-terminus with the client project and will automatically conclude upon completion or termination of the client assignment without any obligation for long-term employment."
  ], x, y);

  y = drawTermSection(page, fonts, "3", "Acceptance of Employment", [
    "Your designation and title information are descriptive and not intended to limit your duties or functions or guarantee you a certain job. Your duties and functions may be modified at the discretion of the Company from time to time.",
    "You hereby accept such employment to the exclusion of all other employments and engagements, on the terms, conditions and stipulations contained herein."
  ], x, y);

  y = drawTermSection(page, fonts, "4", "Transfer & Deputation", [
    "Your services can be transferred to other departments, locations, subsidiaries, sister companies or deputed to any client's site, within or outside India, based on the requirements of the organization or exigencies of work from time to time. Disobedience of such orders of the Company will be construed as misconduct and may lead to punitive action."
  ], x, y);

  y = drawTermSection(page, fonts, "5", "Compliance with the Company's Policy and Procedures", [
    "You understand, agree, acknowledge and undertake that you will be subject to and you agree to comply with all applicable Company policies and procedures, whether in existence or as may be formulated, revised and amended from time to time."
  ], x, y);

  y = drawTermSection(page, fonts, "6", "Applicability of changes in the general terms and conditions of employment and policies made by the company subsequently", [
    "Company reserves the right to amend certain terms and conditions of employment and policies from time to time to cope with changing business needs and environment which shall be communicated appropriately. Unless given specific exemption, you shall be bound by these amended terms and conditions automatically."
  ], x, y);

  y = drawTermSection(page, fonts, "7", "Probation / Training Period", [
    "Your initial employment, probation, training, confirmation and performance expectations shall be governed by the Company's policies and the requirements of the assigned project. The Company may extend, modify or conclude the probation or training period based on performance, conduct and business requirements."
  ], x, y);

  drawTermSection(page, fonts, "8", "Representations and Warranties of the Employee", [
    "8.1. You represent that all documents and facts disclosed to the Company are true and accurate. You further represent that no information material to your employment has been withheld and that you are not restricted by any agreement from accepting this employment.",
    "If it is found subsequently that any information submitted is inaccurate or incomplete, the Company reserves the right to terminate your appointment forthwith, notwithstanding anything to the contrary."
  ], x, y);
}

export async function POST(request) {
  const data = await request.json().catch(() => ({}));
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const pages = pdfDoc.getPages();

  const candidateName = clean(data.candidateName);
  const jobRole = clean(data.jobRole);
  const companyName = clean(data.companyName);
  const offerDate = joinDayAndDate(data.offerDay, data.offerDate);
  const joining = joinDayAndDate(data.joiningDay, data.dateOfJoining);
  const workLocation = clean(data.workLocation);
  const employmentType = clean(data.employmentType);
  const ctc = clean(data.ctc);
  const monthlySalary = clean(data.monthlySalary);
  const joiningBonus = clean(data.joiningBonus);
  const leaveEntitlement = clean(data.leaveEntitlement);
  const acceptanceDate = clean(data.acceptanceDate);

  if (pages[0]) {
    redrawFirstPageBody(pages[0], { regular: times, bold: timesBold }, {
      candidateName,
      jobRole,
      companyName,
      offerDate,
      joining,
      workLocation,
      employmentType,
      ctc,
      monthlySalary,
      joiningBonus,
      leaveEntitlement,
      acceptanceDate
    });
  }

  if (pages[1]) {
    redrawSecondPageTerms(pages[1], { regular: times, bold: timesBold });
  }

  const bytes = await pdfDoc.save();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${candidateName || "talme"}-offer-letter.pdf"`
    }
  });
}
