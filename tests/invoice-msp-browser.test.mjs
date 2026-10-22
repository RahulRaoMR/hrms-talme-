import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { getInvoiceFile, listInvoices, saveInvoice } from "../lib/invoice-records.js";
import { meghaInvoiceParty } from "../lib/invoice-model.js";
import { invoiceTestDatabase } from "./helpers/invoice-db.mjs";
import { invoicePdfText } from "./helpers/invoice-pdf.mjs";
import { referenceParty, referenceRows } from "./helpers/invoice-msp-reference.mjs";

test("the Micron MSP deduction reduces taxable value before GST in the editor, preview and downloaded PDF", {
  skip: process.env.INVOICE_MSP_BROWSER_TESTS !== "true" && "Set INVOICE_MSP_BROWSER_TESTS=true and provide Playwright.",
  timeout: 180000
}, async (t) => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  t.after(() => browser.close());
  const db = invoiceTestDatabase();
  const user = { email: "msp-browser@example.test", name: "MSP Review", role: "Accounts" };
  const legacy = await saveInvoice(db, user, {
    invoiceNo: "LEGACY-MSP-CHECK",
    invoiceData: { invoiceDate: "2026-10-06", state: "Karnataka", tax: "GST@18%" },
    partyData: meghaInvoiceParty,
    rowsData: [{ id: 1, item: "Contract staffing", qty: "1", price: "2110", tax: "Select" }]
  });
  const historical = db.state.invoices.find((row) => row.id === legacy.id);
  for (const key of Object.keys(historical.details.invoiceData).filter((key) => key.startsWith("msp"))) delete historical.details.invoiceData[key];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  t.after(() => context.close());
  await context.addInitScript((user) => {
    sessionStorage.setItem("talme-suite-session", JSON.stringify({ user, token: "msp-test-session" }));
    localStorage.setItem("talme-theme-mode", "light");
  }, user);
  // Exercise the real save/read/PDF services without writing any live records.
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    try {
      if (path === "/api/auth/session") return route.fulfill({ json: { user } });
      if (path === "/api/invoices" && request.method() === "GET") return route.fulfill({ json: await listInvoices(db, user) });
      if (path === "/api/invoices" && request.method() === "POST") return route.fulfill({ json: await saveInvoice(db, user, request.postDataJSON()) });
      const match = path.match(/^\/api\/invoices\/([^/]+)(\/pdf)?$/);
      if (match && request.method() === "PATCH") return route.fulfill({ json: await saveInvoice(db, user, request.postDataJSON(), match[1]) });
      if (match?.[2]) {
        const file = await getInvoiceFile(db, user, match[1]);
        return route.fulfill({ contentType: file.mimeType, body: Buffer.from(file.data) });
      }
      return route.fulfill({ json: [] });
    } catch (error) {
      return route.fulfill({ status: error.status || 500, json: { error: error.message } });
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const amount = async (label) => (await page.locator(".invoice-editor-totals > div").filter({ hasText: label }).locator("strong").textContent()).trim();
  const reopen = async () => page.getByRole("button", { name: "MSP-BROWSER", exact: true }).click();
  const save = async () => {
    await page.getByRole("button", { name: "Save Invoice", exact: true }).click();
    await page.getByRole("button", { name: "MSP-BROWSER", exact: true }).waitFor();
  };
  await page.goto(`${process.env.INVOICE_TEST_BASE_URL || "http://localhost:3000"}/invoices`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New Invoice", exact: true }).click();
  assert.equal(await page.getByLabel("MSP Applicable?", { exact: true }).inputValue(), "no");
  assert.equal(await page.getByLabel("MSP Type", { exact: true }).count(), 0);
  await page.getByLabel("Customer *", { exact: true }).fill(referenceParty.name);
  await page.getByLabel("Customer GSTIN", { exact: true }).fill(referenceParty.gstin);
  await page.getByLabel("Billing Address", { exact: true }).fill(referenceParty.billing);
  await page.getByLabel("Issuing branch", { exact: true }).selectOption("banashankari");
  await page.getByLabel("Place of supply *", { exact: true }).selectOption("Gujarat");
  await page.getByLabel("Customer state", { exact: true }).selectOption("Gujarat");
  await page.getByLabel("Invoice number *", { exact: true }).fill("MSP-BROWSER");
  for (const [index, row] of referenceRows.entries()) {
    if (index) await page.getByRole("button", { name: "Add item", exact: true }).click();
    await page.getByLabel(`Service ${index + 1}`, { exact: true }).fill(row.item);
    await page.getByLabel(`HSN/SAC ${index + 1}`, { exact: true }).fill(row.hsn);
    await page.getByLabel(`Quantity ${index + 1}`, { exact: true }).fill(row.qty);
    await page.getByLabel(`Rate ${index + 1}`, { exact: true }).fill(row.price);
  }
  assert.equal(await amount(/^Invoice total/), "62,021.00");
  await page.getByLabel("MSP Applicable?", { exact: true }).selectOption("yes");
  assert.equal(await page.getByLabel("MSP treatment", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("MSP GST", { exact: true }).count(), 0);
  await page.getByLabel("MSP Rate (%)", { exact: true }).fill("2.32");
  assert.equal(await page.getByLabel("MSP Amount (INR)", { exact: true }).inputValue(), "(-1,219.39)");
  assert.equal(await amount(/^Service \/ item total/), "52,560.00");
  assert.equal(await amount(/^MSP fees/), "(-1,219.39)");
  assert.equal(await amount(/^Taxable value after MSP/), "51,340.61");
  assert.equal(await amount(/^IGST/), "9,241.31");
  assert.equal(await amount(/^Round off/), "0.08");
  assert.equal(await amount(/^Invoice total/), "60,582.00");
  assert.equal(await amount(/^Balance due/), "60,582.00");
  await mkdir("artifacts/invoice-msp-correction", { recursive: true });
  await page.screenshot({ path: "artifacts/invoice-msp-correction/new-invoice-desktop.png", fullPage: true });
  await page.locator(".invoice-editor-bottom").screenshot({ path: "artifacts/invoice-msp-correction/msp-fields-and-summary.png" });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.locator('canvas[data-rendered="true"]').waitFor({ timeout: 60000 });
  for (let index = 0; index < 6; index += 1) {
    const previousText = await page.locator(".invoice-preview-text").textContent();
    if (previousText.includes("MSP fees")) break;
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.waitForFunction((previous) => document.querySelector('canvas[data-rendered="true"]') && document.querySelector(".invoice-preview-text")?.textContent !== previous, previousText);
  }
  const previewText = await page.locator(".invoice-preview-text").textContent();
  assert.ok(previewText.includes("MSP fees (-2.32%)"));
  assert.ok(previewText.includes("(-1,219.39)"));
  assert.ok(previewText.includes("51,340.61"));
  assert.ok(previewText.includes("60,582.00"));
  await page.locator('canvas[data-rendered="true"]').screenshot({ path: "artifacts/invoice-msp-correction/pdf-preview-msp-page.png" });
  const previewDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download preview invoice", exact: true }).click();
  await (await previewDownload).saveAs("artifacts/invoice-msp-correction/micron-msp-preview.pdf");
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await save();
  const stored = db.state.invoices.find((row) => row.invoiceNo === "MSP-BROWSER");
  assert.equal(stored.status, "Unpaid");
  assert.equal(stored.mspTreatment, "DEDUCTION");
  assert.equal(stored.mspAmount, "1219.39");
  const savedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download invoice MSP-BROWSER", exact: true }).click();
  const downloadPath = "artifacts/invoice-msp-correction/micron-msp-saved.pdf";
  await (await savedDownload).saveAs(downloadPath);
  const savedText = await invoicePdfText(await readFile(downloadPath));
  for (const text of ["MSP fees (-2.32%)", "(-1,219.39)", "51,340.61", "9,241.31", "60,582.00"]) assert.ok(savedText.includes(text), text);
  await reopen();
  assert.equal(await page.getByLabel("MSP Rate (%)", { exact: true }).inputValue(), "2.32");
  await page.getByLabel("Payment received", { exact: true }).check();
  assert.equal(await page.getByLabel("Received amount", { exact: true }).inputValue(), "60582");
  await page.getByLabel("Received amount", { exact: true }).fill("10000");
  assert.equal(await amount(/^Balance due/), "50,582.00");
  await page.getByLabel("MSP Channel / Platform", { exact: true }).fill("ABC Platform");
  await page.getByLabel("MSP Rate (%)", { exact: true }).fill("3");
  assert.equal(await amount(/^Taxable value after MSP/), "50,983.20");
  assert.equal(await amount(/^Invoice total/), "60,160.00");
  await page.getByLabel("MSP Type", { exact: true }).selectOption("FIXED");
  await page.getByLabel("MSP Amount (INR)", { exact: true }).fill("1219.39");
  assert.equal(await amount(/^Taxable value after MSP/), "51,340.61");
  assert.equal(await amount(/^Invoice total/), "60,582.00");
  assert.equal(await page.locator(".invoice-editor-table tfoot .invoice-number").first().textContent(), "9,241.31");
  await save();
  assert.equal(db.state.invoices.find((row) => row.invoiceNo === "MSP-BROWSER").status, "Part Paid");
  await page.reload({ waitUntil: "networkidle" });
  await reopen();
  assert.equal(await page.getByLabel("MSP Type", { exact: true }).inputValue(), "FIXED");
  assert.equal(await page.getByLabel("MSP Amount (INR)", { exact: true }).inputValue(), "1219.39");
  assert.equal(await page.getByLabel("MSP Channel / Platform", { exact: true }).inputValue(), "ABC Platform");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const openMenu = page.getByRole("button", { name: "Open Core menu", exact: true });
    if (await openMenu.getAttribute("aria-expanded") === "true") await page.locator(".mobile-nav-close").click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}px overflow`);
    await page.locator(".invoice-editor-bottom").screenshot({ path: `artifacts/invoice-msp-correction/editor-${width}.png` });
  }
  await page.getByLabel("MSP Applicable?", { exact: true }).selectOption("no");
  assert.equal(await page.getByLabel("MSP Amount (INR)", { exact: true }).count(), 0);
  assert.equal(await amount(/^Invoice total/), "62,021.00");
  assert.equal(await amount(/^Balance due/), "52,021.00");
  await save();
  assert.equal(db.state.invoices.find((row) => row.invoiceNo === "MSP-BROWSER").mspAmount, "0");
  await page.getByRole("button", { name: "LEGACY-MSP-CHECK", exact: true }).click();
  assert.equal(await page.getByLabel("MSP Applicable?", { exact: true }).inputValue(), "no");
  assert.equal(await amount(/^Invoice total/), "2,490.00");
  assert.deepEqual(errors, []);
});
