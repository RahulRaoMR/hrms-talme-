import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { drawNdaLetter } from "@/lib/nda-letter";

export const dynamic = "force-dynamic";

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const TALME_BLUE = rgb(0.16, 0.18, 0.54);

const templates = {
  experience: "talme-experience-letter-template.pdf",
  relieving: "talme-relieving-letter-template.pdf",
  nda: "talme-nda-letter-template.pdf"
};

function clean(value) {
  return String(value || "").trim();
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

function drawWrapped(page, font, text, x, y, options = {}) {
  const size = options.size || 10;
  const maxWidth = options.maxWidth || 500;
  const lineHeight = options.lineHeight || 13;
  const paragraphGap = options.paragraphGap ?? lineHeight * 0.45;
  const paragraphs = String(text || "").split(/\n+/);
  let currentY = y;

  paragraphs.forEach((paragraph) => {
    const words = clean(paragraph).split(/\s+/).filter(Boolean);
    let line = "";

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(nextLine, size) > maxWidth && line) {
        drawText(page, font, line, x, currentY, { size });
        currentY -= lineHeight;
        line = word;
        return;
      }
      line = nextLine;
    });

    if (line) {
      drawText(page, font, line, x, currentY, { size });
      currentY -= lineHeight;
    }
    currentY -= paragraphGap;
  });

  return currentY;
}

function cover(page, x, y, width, height) {
  page.drawRectangle({ x, y, width, height, color: WHITE, opacity: 1 });
}

function fill(page, x, y, width, height, color) {
  page.drawRectangle({ x, y, width, height, color, opacity: 1 });
}

function centered(page, font, text, y, options = {}) {
  const size = options.size || 12;
  const width = font.widthOfTextAtSize(String(text || ""), size);
  drawText(page, font, text, (page.getWidth() - width) / 2, y, { ...options, size });
}

function drawLetterFooter(page, font) {
  centered(page, font, "Level 14, Concorde Towers, UB City, No.24 Vittal Mallya Road, Bangalore, Karnataka, 560001, India. Centre Name - UB City", 54, { size: 8.2 });
  centered(page, font, "Email: hr@talme.in          Phone: +91 94818 38000 | +91 97318 38000          Website: www.talme.in", 41, { size: 8.2 });
}

function buildExperienceBody(data) {
  return [
    `This is to certify that Mr.${data.employeeName} was employed with Talme Technologies Private Ltd in the role of ${data.designation} from ${data.startDate} to ${data.endDate}.`,
    "Through out the tenure He demonstrated exceptional dedication and commitment to his role, consistently delivering high-quality work and fulfilling all assigned responsibilities with sincerity and professionalism.",
    "His performance has been commendable, and He has proven to be an asset to our organisation. We are confident that his skills, passion, and determination will enable him to succeed in all his future endeavours. We extend our best wishes to him for continued success in his career and personal growth."
  ].join("\n\n");
}

function buildRelievingBody(data) {
  return [
    `This letter serves as official confirmation of your relieved services / employment with ${data.companyName} and the effective date is ${data.relievingDate}.`,
    `We would like to express our appreciation for your contributions and efforts during your tenure with ${data.companyName}. Your dedication, hard work, and commitment to your responsibilities are duly acknowledged and valued.`,
    "We understand that the end of employment can be a challenging period of transition. Therefore, we want to ensure that this process is as smooth as possible for you. Below are the details and instructions regarding your relieving process:",
    "Documentation: The HR department will provide you with the necessary documents, such as your experience certificate and relevant paperwork, If you have any specific requirements or need assistance with future job applications, please feel free to contact the HR department.",
    "We would like to extend our best wishes to you in your future endeavours. We believe that your skills and capabilities will lead you to success in your professional journey. If you have any further questions or require additional information, please do not hesitate to reach out to the HR department. They will be happy to assist you during this transition period.",
    `Thank you once again for your contribution to ${data.companyName}. We value the time you spent with us and wish you all the best for your future endeavours.`
  ].join("\n\n");
}

function drawExperienceOrRelieving(pdfDoc, fonts, data, type) {
  const page = pdfDoc.getPages()[0];
  const { regular, bold } = fonts;
  const title = type === "experience" ? "Experience Letter" : "Relieving Letter";
  const body = data.body || (type === "experience" ? buildExperienceBody(data) : buildRelievingBody(data));

  cover(page, 38, 124, page.getWidth() - 76, 610);
  drawText(page, regular, `Date: ${data.issueDate}`, 58, 702, { size: 10 });
  centered(page, bold, title, 650, { size: 15 });
  drawText(page, regular, `To,`, 58, 605, { size: 10 });
  drawWrapped(page, regular, data.employeeName, 58, 587, { size: 10.5, maxWidth: 480, lineHeight: 13 });
  drawText(page, regular, `Subject: ${title}`, 58, 542, { size: 10.5 });
  drawText(page, regular, "Dear Sir/Madam,", 58, 504, { size: 10.5 });
  const y = drawWrapped(page, regular, body, 58, 476, { size: 10.5, maxWidth: 486, lineHeight: 14 });
  drawText(page, regular, "For Talme Technologies Pvt Ltd", 58, Math.max(190, y - 22), { size: 10.5 });
  drawText(page, bold, data.signatoryName, 58, Math.max(150, y - 70), { size: 10.5 });
  drawText(page, regular, data.signatoryTitle, 58, Math.max(134, y - 86), { size: 10.5 });
}

async function drawRelievingLetter(pdfDoc, fonts, data) {
  const page = pdfDoc.getPages()[0];
  const { sans, sansBold } = fonts;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const body = data.body || buildRelievingBody(data);
  const displayName = /^m(r|s|rs|iss)\./i.test(data.employeeName) ? data.employeeName : `Mr.${data.employeeName}`;
  const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "talme-logo-pdf.png")).catch(() => null);

  cover(page, 0, 0, pageWidth, pageHeight);
  fill(page, 4, pageHeight - 27, pageWidth - 8, 22, TALME_BLUE);
  fill(page, 4, 8, pageWidth - 8, 24, TALME_BLUE);

  if (logoBytes) {
    const logo = await pdfDoc.embedPng(logoBytes);
    page.drawImage(logo, { x: pageWidth - 112, y: pageHeight - 106, width: 50, height: 50 });
  }

  drawText(page, sansBold, displayName, 36, 705, { size: 11 });
  drawText(page, sansBold, `Date:${data.issueDate}`, 420, 705, { size: 11 });
  centered(page, sansBold, "RELIEVING LETTER", 650, { size: 12 });

  const bodyEndY = drawWrapped(page, sans, body, 36, 618, {
    size: 12.3,
    maxWidth: pageWidth - 72,
    lineHeight: 15.25,
    paragraphGap: 2.4
  });
  const signatureTopY = Math.max(260, bodyEndY - 72);

  drawText(page, sansBold, `For ${data.companyName}`, 36, signatureTopY, { size: 10.4 });
  drawText(page, sansBold, data.signatoryTitle, 36, signatureTopY - 66, { size: 10.4 });

  drawLetterFooter(page, sans);
}

async function drawExperienceLetter(pdfDoc, fonts, data) {
  const page = pdfDoc.getPages()[0];
  const { sans, sansBold } = fonts;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const body = data.body || buildExperienceBody(data);
  const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "talme-logo-pdf.png")).catch(() => null);

  cover(page, 0, 0, pageWidth, pageHeight);
  fill(page, 4, pageHeight - 27, pageWidth - 8, 22, TALME_BLUE);
  fill(page, 4, 8, pageWidth - 8, 24, TALME_BLUE);

  if (logoBytes) {
    const logo = await pdfDoc.embedPng(logoBytes);
    page.drawImage(logo, { x: pageWidth - 112, y: pageHeight - 106, width: 50, height: 50 });
  }

  drawText(page, sansBold, `Date : ${data.issueDate}`, pageWidth - 164, 690, { size: 9.2 });
  centered(page, sansBold, "To Whom It May Concern", 638, { size: 11.2 });

  drawWrapped(page, sansBold, body, 44, 590, {
    size: 10.9,
    maxWidth: pageWidth - 88,
    lineHeight: 13.5,
    paragraphGap: 9
  });

  drawText(page, sansBold, `For ${data.companyName}`, 44, 298, { size: 9.1 });
  drawText(page, sansBold, data.signatoryTitle, 44, 232, { size: 9.1 });

  drawLetterFooter(page, sans);
}

async function drawNda(pdfDoc, fonts, data) {
  const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "talme-logo-pdf.png")).catch(() => null);
  const logo = logoBytes ? await pdfDoc.embedPng(logoBytes) : null;
  drawNdaLetter(pdfDoc, { regular: fonts.sans, bold: fonts.sansBold }, data, (page) => {
    const width = page.getWidth();
    const height = page.getHeight();
    fill(page, 4, height - 27, width - 8, 22, TALME_BLUE);
    fill(page, 4, 8, width - 8, 24, TALME_BLUE);
    if (logo) page.drawImage(logo, { x: width - 112, y: height - 97, width: 50, height: 50 });
    drawLetterFooter(page, fonts.sans);
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const type = clean(body.type);
  const template = templates[type];

  if (!template) {
    return NextResponse.json({ error: "Unsupported letter type." }, { status: 400 });
  }

  const data = {
    employeeName: clean(body.employeeName) || "Employee Name",
    designation: clean(body.designation) || "Designation",
    companyName: clean(body.companyName) || "Talme Technologies Pvt Ltd",
    companyAddress: clean(body.companyAddress) || "Level 14, Concorde Towers, UB City, Bengaluru, Karnataka, India",
    employeeAddress: clean(body.employeeAddress) || "Employee Address",
    issueDate: clean(body.issueDate) || "02 June 2026",
    agreementDate: clean(body.agreementDate) || clean(body.issueDate) || "02 June 2026",
    acceptancePlace: clean(body.acceptancePlace),
    startDate: clean(body.startDate) || "Start Date",
    endDate: clean(body.endDate) || "End Date",
    relievingDate: clean(body.relievingDate) || clean(body.endDate) || "13th March 2026",
    body: clean(body.body),
    signatoryName: clean(body.signatoryName) || "Authorized Signatory",
    signatoryTitle: clean(body.signatoryTitle)
  };

  // NDA content is drawn in full, rather than covering the reference PDF with
  // a summary (which hid clauses and retained the reference employee underneath).
  const pdfDoc = await PDFDocument.create();
  if (["experience", "relieving"].includes(type)) {
    pdfDoc.addPage([595.5, 842.2499787]);
  }
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (type === "nda") {
    await drawNda(pdfDoc, { sans, sansBold }, data);
  } else if (type === "relieving") {
    await drawRelievingLetter(pdfDoc, { sans, sansBold }, data);
  } else if (type === "experience") {
    await drawExperienceLetter(pdfDoc, { sans, sansBold }, data);
  } else {
    drawExperienceOrRelieving(pdfDoc, { regular, bold }, data, type);
  }

  const bytes = await pdfDoc.save();
  const fileName = `${data.employeeName}-${type}-letter.pdf`.replace(/[^\w.-]+/g, "-");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
