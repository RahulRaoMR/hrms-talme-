import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { drawNdaLetter } from "../lib/nda-letter.js";

const referenceData = {
  employeeName: "Shehnaz Alam",
  companyName: "Talme Technologies Private Limited",
  companyAddress: "Level 14, Concorde Towers, UB City, No.24 Vittal Mallya Road, Bangalore, Karnataka, 560001, India. Centre Name - UB City 2",
  employeeAddress: "Bengaluru, Karnataka",
  agreementDate: "22 May 2026",
  startDate: "05 April 2026",
  acceptancePlace: "Bengaluru",
  signatoryTitle: "HR Manager"
};

const clauseTitles = ["Confidential Information", "Restrictions and Exceptions", "Non-Disclosure", "Ownership of Confidential Information", "Return of materials and documents", "Non-Circumvention", "Non-Solicitation", "No Tampering", "Remedy", "Termination", "General"];
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

async function readPdf(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true });
  const pdf = await loading.promise;
  const pages = [];
  try {
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const page = await pdf.getPage(n);
      const { items } = await page.getTextContent();
      const rows = [];
      for (const item of items.filter((item) => item.str.trim()).sort((a, b) => b.transform[5] - a.transform[5])) {
        let row = rows.find((row) => Math.abs(row.y - item.transform[5]) < 3);
        if (!row) { row = { y: item.transform[5], items: [] }; rows.push(row); }
        row.items.push(item);
      }
      pages.push({ text: rows.map((row) => row.items.sort((a, b) => a.transform[4] - b.transform[4]).map((item) => item.str).join(" ")).join("\n"), items, width: page.view[2] });
    }
    return pages;
  } finally {
    await loading.destroy();
  }
}

async function render(data = referenceData) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  drawNdaLetter(doc, { regular, bold }, data, () => {});
  return readPdf(await doc.save());
}

function assertBodyBounds(pages) {
  for (const page of pages) for (const item of page.items.filter((item) => item.str.trim())) {
    assert.ok(item.transform[5] >= 88, `Text stays above the footer: ${item.str}`);
    assert.ok(item.transform[4] >= 53 && item.transform[4] + item.width <= page.width - 53, `Text fits inside both margins: ${item.str}`);
  }
}

test("NDA retains every complete reference clause and the acknowledgment/acceptance", async () => {
  const reference = await readPdf(await readFile(new URL("../public/templates/talme-nda-letter-template.pdf", import.meta.url)));
  const actual = await render();
  assert.equal(actual.length, 3, "The standard NDA retains the reference's three pages.");
  // Compare entire clauses with the actual reference, ignoring only spacing,
  // punctuation and letter case (the PDF has several run-together words).
  const markers = clauseTitles.map((title, index) => normalize(`${index + 1}. ${title}:`));
  for (let index = 0; index < markers.length; index += 1) {
    const pageNumber = index < 3 ? 0 : index < 10 ? 1 : 2;
    const source = normalize(reference[pageNumber].text);
    const from = source.indexOf(markers[index]);
    assert.ok(from >= 0, `Reference contains ${clauseTitles[index]}`);
    const endMarker = index === 2 ? "employeeshouldnotindulge" : index === 10 ? "theemployeeacknowledges" : markers[index + 1];
    const until = source.indexOf(endMarker, from + markers[index].length);
    // The reference's contact footer is an image, so clause ten ends the text.
    const end = index === 9 ? source.length : until;
    assert.ok(end > from, `Reference clause boundary: ${clauseTitles[index]}`);
    const expectedClause = source.slice(from, end);
    assert.ok(normalize(actual[pageNumber].text).includes(expectedClause), `Full reference clause retained: ${clauseTitles[index]}`);
  }
  const text = actual.map((page) => page.text).join("\n");
  for (const phrase of ["05 April 2026", "Employee should not indulge", "The Employee acknowledges", "ACCEPTANCE:", "without any reservations", "Date: 22 May 2026", "Place: Bengaluru", "Signature:", "Name: Shehnaz Alam"]) assert.ok(text.includes(phrase), phrase);
  assertBodyBounds(actual);
});

test("Custom confidentiality text supplements all clauses and paginates safely", async () => {
  const actual = await render({
    ...referenceData,
    employeeName: "Asha Rao",
    employeeAddress: "Hyderabad, Telangana",
    companyName: "Example Technologies Private Limited",
    companyAddress: "123 Example Road, Hyderabad, Telangana, India",
    agreementDate: "01 November 2026",
    startDate: "15 October 2026",
    acceptancePlace: "Hyderabad",
    body: Array.from({ length: 60 }, (_, index) => `Supplement ${index + 1}: Project documents must remain confidential and must be returned to the Company upon request.`).join("\n")
  });
  const text = actual.map((page) => page.text).join("\n");
  const flat = normalize(text);
  assert.ok(actual.length > 3, "Long supplementary terms add pages.");
  for (const [index, title] of clauseTitles.entries()) assert.ok(flat.includes(normalize(`${index + 1}. ${title}:`)), title);
  for (const phrase of ["Asha Rao", "Example Technologies Private Limited", "15 October 2026", "Date: 01 November 2026", "Place: Hyderabad", "Supplement 60:", "ACCEPTANCE:"]) assert.ok(text.includes(phrase), phrase);
  assert.equal(text.includes("Shehnaz"), false, "No reference employee is retained beneath the new content.");
  assert.equal(text.includes("Talme Technologies"), false);
  assert.ok(text.indexOf("Supplement 60:") < text.indexOf("ACCEPTANCE:"));
  assertBodyBounds(actual);
});
