import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { invoicePdfText } from "./helpers/invoice-pdf.mjs";

const clauseTitles = ["Confidential Information", "Restrictions and Exceptions", "Non-Disclosure", "Ownership of Confidential Information", "Return of materials and documents", "Non-Circumvention", "Non-Solicitation", "No Tampering", "Remedy", "Termination", "General"];

async function verifyNda(bytes, employeeName) {
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 3);
  const text = (await invoicePdfText(bytes)).replace(/\s+/g, " ");
  for (const [index, title] of clauseTitles.entries()) assert.ok(text.includes(`${index + 1}. ${title}:`), title);
  for (const phrase of [employeeName, "Employee should not indulge", "Rs.10 lakh", "The Employee acknowledges", "ACCEPTANCE:", "without any reservations", "Signature:", "Email: hr@talme.in"]) assert.ok(text.includes(phrase), phrase);
  assert.equal(text.includes("Authorized Signatory"), false);
  assert.equal(text.includes("Digitally signed by"), false);
  return text;
}

async function previewBytes(page) {
  return Buffer.from(await page.evaluate(async () => {
    const url = document.querySelector('iframe[title="Live NDA Letter preview"]').getAttribute("src").split("#")[0];
    return Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer()));
  }));
}

test("Running NDA form previews and generates every reference clause with edited details", {
  skip: process.env.NDA_LETTER_BROWSER_TESTS !== "true" && "Set NDA_LETTER_BROWSER_TESTS=true and provide Playwright.",
  timeout: 120000
}, async (t) => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });
  t.after(() => context.close());
  const user = { email: "nda-preview-check@example.test", name: "Letter Preview", role: "Super Admin" };
  await context.addInitScript((user) => {
    sessionStorage.setItem("talme-suite-session", JSON.stringify({ user, token: "letter-preview-session" }));
    localStorage.setItem("talme-theme-mode", "light");
  }, user);
  // Shell data is isolated from production records; PDF generation is real.
  await context.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/api/pdf/")) return route.continue();
    return route.fulfill({ json: pathname === "/api/auth/session" ? { user } : [] });
  });
  const output = "artifacts/nda-letter-correction";
  await mkdir(output, { recursive: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${process.env.LETTERS_TEST_BASE_URL || "http://127.0.0.1:3000"}/letters`, { waitUntil: "networkidle" });
  await page.locator(".letter-type-tabs button").filter({ hasText: "NDA Letter" }).click();
  await page.getByRole("heading", { name: "NDA Letter preview", exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('iframe[title="Live NDA Letter preview"]')?.getAttribute("src")?.startsWith("blob:"));
  assert.equal(await page.getByLabel("Employee Name", { exact: true }).inputValue(), "", "NDA starts with a blank name for manual entry.");
  assert.equal(await page.getByLabel("Employee Name", { exact: true }).getAttribute("placeholder"), "Enter employee name");
  assert.equal(await page.getByLabel("Employment Effective Date", { exact: true }).inputValue(), "05 April 2026");
  assert.equal(await page.getByLabel("Acceptance Place", { exact: true }).inputValue(), "Bengaluru");
  assert.equal(await page.getByLabel("Signatory Name", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("Signatory Title", { exact: true }).inputValue(), "");
  const originalBytes = await previewBytes(page);
  const originalText = await verifyNda(originalBytes, "Employee Name");
  assert.equal(originalText.includes("Shehnaz"), false, "The reference employee is not used as the default.");
  assert.equal(originalText.includes("HR Manager"), false, "A blank signatory title stays blank in the PDF.");
  for (const phrase of ["05 April 2026", "Date: 22 May 2026", "Place: Bengaluru"]) assert.ok(originalText.includes(phrase), phrase);
  await writeFile(`${output}/nda-preview.pdf`, originalBytes);
  // Allow Chromium's native viewer to finish painting before capturing the UI.
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${output}/nda-letter-generator.png`, fullPage: true });

  const previousUrl = await page.getByTitle("Live NDA Letter preview").getAttribute("src");
  await page.getByLabel("Employee Name", { exact: true }).fill("Asha Rao");
  await page.getByLabel("Company Name", { exact: true }).fill("Example Technologies Private Limited");
  await page.getByLabel("Company Address").fill("123 Example Road, Pune, Maharashtra, India");
  await page.getByLabel("Employee Address").fill("Pune, Maharashtra");
  await page.getByLabel("Agreement Date", { exact: true }).fill("01 November 2026");
  await page.getByLabel("Employment Effective Date", { exact: true }).fill("15 October 2026");
  await page.getByLabel("Acceptance Place", { exact: true }).fill("Pune");
  await page.getByLabel("Signatory Title", { exact: true }).fill("People Operations Lead");
  const customBody = "Project Orion information must remain confidential.";
  const updatedResponse = page.waitForResponse((response) => response.url().endsWith("/api/pdf/hr-letter") && response.request().postDataJSON()?.body === customBody);
  await page.getByLabel("Additional Confidentiality Terms (Optional)", { exact: true }).fill(customBody);
  assert.equal((await updatedResponse).status(), 200);
  await page.getByRole("heading", { name: "NDA Letter preview", exact: true }).waitFor();
  assert.notEqual(await page.getByTitle("Live NDA Letter preview").getAttribute("src"), previousUrl);
  const editedText = await verifyNda(await previewBytes(page), "Asha Rao");
  for (const phrase of ["Example Technologies Private Limited", "15 October 2026", "Date: 01 November 2026", "Place: Pune", "People Operations Lead", customBody]) assert.ok(editedText.includes(phrase), phrase);
  assert.equal(editedText.includes("Shehnaz"), false);
  assert.equal(editedText.includes("Talme Technologies"), false);

  const generatedResponse = page.waitForResponse((response) => response.url().endsWith("/api/pdf/hr-letter") && response.request().postDataJSON()?.type === "nda");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Generate NDA Letter", exact: true }).first().click();
  assert.equal((await generatedResponse).status(), 200);
  const popup = await popupPromise;
  await popup.waitForURL(/^blob:/);
  const generatedBytes = Buffer.from(await page.evaluate(async (url) => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), popup.url()));
  assert.equal(await verifyNda(generatedBytes, "Asha Rao"), editedText);
  await writeFile(`${output}/nda-generated-edited.pdf`, generatedBytes);
  assert.deepEqual(errors, []);
});
