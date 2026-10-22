import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { invoicePdfText } from "./helpers/invoice-pdf.mjs";

async function assertReadableCenteredFooter(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true });
  const pdf = await loading.promise;
  try {
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const footer = content.items.filter((item) => item.str.trim() && item.transform[5] > 32 && item.transform[5] < 80);
    const footerText = footer.map((item) => item.str).join(" ");
    for (const label of ["Level 14", "Email: hr@talme.in", "Phone:", "Website: www.talme.in"]) assert.ok(footerText.includes(label), label);
    const lines = new Map();
    for (const item of footer) {
      assert.ok(item.height >= 8, "Footer text is readable at eight points or larger.");
      assert.ok(item.transform[4] >= 36 && item.transform[4] + item.width <= page.view[2] - 36, "Footer fits inside the page margins.");
      const key = Math.round(item.transform[5]);
      const bounds = lines.get(key) || { left: Infinity, right: -Infinity };
      bounds.left = Math.min(bounds.left, item.transform[4]);
      bounds.right = Math.max(bounds.right, item.transform[4] + item.width);
      lines.set(key, bounds);
    }
    assert.equal(lines.size, 2);
    for (const bounds of lines.values()) assert.ok(Math.abs((bounds.left + bounds.right) / 2 - page.view[2] / 2) < 3, "Each footer line is centered on the PDF page.");
  } finally {
    await loading.destroy();
  }
}

test("Letter Generator Experience preview and generated PDF contain no signature", {
  skip: process.env.EXPERIENCE_LETTER_BROWSER_TESTS !== "true" && "Set EXPERIENCE_LETTER_BROWSER_TESTS=true and provide Playwright.",
  timeout: 120000
}, async (t) => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1536, height: 1100 } });
  t.after(() => context.close());
  const user = { email: "letter-preview-check@example.test", name: "Letter Preview", role: "Super Admin" };
  await context.addInitScript((user) => {
    sessionStorage.setItem("talme-suite-session", JSON.stringify({ user, token: "letter-preview-session" }));
    localStorage.setItem("talme-theme-mode", "light");
  }, user);
  let releasePreview;
  const previewGate = new Promise((resolve) => { releasePreview = resolve; });
  t.after(() => releasePreview());
  // Only shell/directory reads are fixtures. Both PDF endpoints use the running app.
  await context.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/pdf/hr-letter" && route.request().postDataJSON()?.type === "experience") {
      await previewGate;
      return route.continue();
    }
    if (pathname.startsWith("/api/pdf/")) return route.continue();
    if (pathname === "/api/auth/session") return route.fulfill({ json: { user } });
    return route.fulfill({ json: [] });
  });
  const base = process.env.LETTERS_TEST_BASE_URL || "http://127.0.0.1:3000";
  const output = "artifacts/experience-signature-removal";
  await mkdir(output, { recursive: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/letters`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Letter Generator", exact: true }).waitFor();
  const previewResponse = page.waitForResponse((response) => response.url().endsWith("/api/pdf/hr-letter") && response.request().postDataJSON()?.type === "experience");
  await page.locator(".letter-type-tabs button").filter({ hasText: "Experience Letter" }).click();
  // The original template remains unsigned, but it is no longer used as a
  // fallback because it contains the reference employee's name.
  const templateResponse = await context.request.get(`${base}/templates/talme-experience-letter-template.pdf?v=unsigned`);
  assert.equal(templateResponse.status(), 200);
  const template = await PDFDocument.load(await templateResponse.body());
  assert.equal(template.getForm().getFields().some((field) => field.constructor.name === "PDFSignature"), false);
  assert.equal(template.getPage(0).node.Annots()?.size() || 0, 0);
  assert.ok((await page.getByTitle("Live Experience Letter preview").getAttribute("src")).startsWith("about:blank"));
  assert.equal(await page.getByLabel("Employee Name", { exact: true }).inputValue(), "");
  assert.equal(await page.getByLabel("Signatory Name", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("Signatory Title", { exact: true }).inputValue(), "");
  await page.locator(".letter-preview-panel").screenshot({ path: `${output}/experience-fallback-in-generator.png` });
  releasePreview();
  const preview = await previewResponse;
  assert.equal(preview.status(), 200);
  await page.waitForFunction(() => document.querySelector('iframe[title="Live Experience Letter preview"]')?.getAttribute("src")?.startsWith("blob:"));
  await page.getByRole("heading", { name: "Experience Letter preview", exact: true }).waitFor();
  const bytes = Buffer.from(await page.evaluate(async () => {
    const url = document.querySelector('iframe[title="Live Experience Letter preview"]').getAttribute("src").split("#")[0];
    return Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer()));
  }));
  assert.ok(bytes.length > 1000, "The actual preview blob contains the generated PDF.");
  await assertReadableCenteredFooter(bytes);
  const text = await invoicePdfText(bytes);
  for (const removed of ["Chandan Y C", "Saidarshan", "Digitally signed by", "2026.04.21", "10:17:54", "HR Manager", "Director of Talme Technologies"]) assert.equal(text.includes(removed), false, removed);
  for (const retained of ["Employee Name", "To Whom It May Concern", "For Talme Technologies Pvt Ltd"]) assert.ok(text.includes(retained), retained);
  await writeFile(`${output}/letter-generator-live.pdf`, bytes);
  await page.locator(".letter-preview-panel").screenshot({ path: `${output}/experience-live-in-generator.png` });
  await page.screenshot({ path: `${output}/letter-generator-experience-page.png`, fullPage: true });
  const generatedResponse = page.waitForResponse((response) => response.url().endsWith("/api/pdf/hr-letter") && response.request().postDataJSON()?.type === "experience");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Generate Experience Letter", exact: true }).first().click();
  const generated = await generatedResponse;
  assert.equal(generated.status(), 200);
  const popup = await popupPromise;
  const generatedBytes = Buffer.from(await page.evaluate(async (url) => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), popup.url()));
  const generatedText = await invoicePdfText(generatedBytes);
  assert.equal(generatedText.includes("Saidarshan"), false);
  assert.equal(generatedText.includes("Digitally signed by"), false);
  for (const title of ["Relieving Letter", "NDA Letter"]) {
    await page.locator(".letter-type-tabs button").filter({ hasText: title }).click();
    assert.equal(await page.getByLabel("Signatory Name", { exact: true }).count(), 0, title);
    assert.equal(await page.getByLabel("Signatory Title", { exact: true }).count(), 1, title);
    await page.locator(".letter-form-panel").screenshot({ path: `${output}/${title.toLowerCase().replaceAll(" ", "-")}-form.png` });
    if (title === "Relieving Letter") {
      await page.getByRole("heading", { name: "Relieving Letter preview", exact: true }).waitFor();
      const relievingBytes = Buffer.from(await page.evaluate(async () => {
        const url = document.querySelector('iframe[title="Live Relieving Letter preview"]').getAttribute("src").split("#")[0];
        return Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer()));
      }));
      await assertReadableCenteredFooter(relievingBytes);
      await writeFile(`${output}/relieving-letter-live.pdf`, relievingBytes);
      await page.locator(".letter-preview-panel").screenshot({ path: `${output}/relieving-live-in-generator.png` });
    }
  }
  assert.deepEqual(errors, []);
});
