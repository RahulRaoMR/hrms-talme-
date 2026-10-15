import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { getInvoiceFile, listInvoices, saveInvoice } from "../lib/invoice-records.js";
import { meghaInvoiceParty } from "../lib/invoice-model.js";
import { invoiceTestDatabase } from "./helpers/invoice-db.mjs";
import { invoicePdfText } from "./helpers/invoice-pdf.mjs";

test("invoice branches select, preview, download, and reopen across Accounts and Super Admin", {
  skip: process.env.INVOICE_BRANCH_BROWSER_TESTS === "true" ? false : "Set INVOICE_BRANCH_BROWSER_TESTS=true and provide Playwright.",
  timeout: 240000
}, async (t) => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  t.after(() => browser.close());
  const db = invoiceTestDatabase();
  const accounts = { email: "invoice-branch-browser@example.test", name: "Branch Review", role: "Accounts" };
  const legacy = await saveInvoice(db, accounts, {
    invoiceNo: "LEGACY-BRANCH",
    invoiceData: { invoiceDate: "2026-10-06", mode: "Credit", state: "Karnataka", tax: "GST@18%" },
    partyData: meghaInvoiceParty,
    rowsData: [{ id: 1, item: "Contract staffing", hsn: "998513", qty: "1", price: "2110", tax: "Select" }]
  });
  delete db.state.invoices.find((row) => row.id === legacy.id).details.invoiceData.branchId;
  const base = process.env.INVOICE_TEST_BASE_URL || "http://localhost:3000";
  const output = "artifacts/invoice-branches";
  await mkdir(output, { recursive: true });
  const pageErrors = [];

  async function open(role, width) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, acceptDownloads: true });
    const user = { ...accounts, role };
    await context.addInitScript((user) => {
      sessionStorage.setItem("talme-suite-session", JSON.stringify({ user, token: "branch-test-session" }));
      localStorage.setItem("talme-theme-mode", "light");
    }, user);
    // All API traffic stays in memory; never change real invoices or audit records.
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const method = request.method();
      try {
        if (path === "/api/auth/session") return route.fulfill({ json: { user } });
        if (path === "/api/invoices" && method === "GET") return route.fulfill({ json: await listInvoices(db, user) });
        if (path === "/api/invoices" && method === "POST") return route.fulfill({ json: await saveInvoice(db, user, request.postDataJSON()) });
        const match = path.match(/^\/api\/invoices\/([^/]+)(\/pdf)?$/);
        if (match && method === "PATCH") return route.fulfill({ json: await saveInvoice(db, user, request.postDataJSON(), match[1]) });
        if (match?.[2] && method === "GET") {
          const file = await getInvoiceFile(db, user, match[1]);
          return route.fulfill({ contentType: file.mimeType, body: Buffer.from(file.data) });
        }
        return route.fulfill({ json: [] });
      } catch (error) {
        return route.fulfill({ status: error.status || 500, json: { error: error.message } });
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${base}/invoices`, { waitUntil: "networkidle", timeout: 90000 });
    return { context, page };
  }

  async function checkLayout(page) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    const field = await page.getByLabel("Issuing branch", { exact: true }).boundingBox();
    assert.ok(field.width >= 200 && field.x >= 0 && field.x + field.width <= page.viewportSize().width);
    const details = await page.locator(".invoice-supplier-details").boundingBox();
    assert.ok(details.x + details.width <= field.x + 1 || details.y + details.height <= field.y, "Branch selector does not overlap company details");
  }

  async function checkPreview(page, width) {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await page.locator('canvas[data-rendered="true"]').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => document.querySelector(".invoice-preview-text")?.textContent.includes("Bengaluru 560070"));
    const text = await page.locator(".invoice-preview-text").textContent();
    assert.equal(text.includes("560001"), false);
    assert.ok(text.includes(meghaInvoiceParty.gstin));
    assert.ok(await page.locator(".invoice-preview-dialog canvas").evaluate((canvas) => {
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 180 && pixels[i + 1] < 180 && pixels[i + 2] < 180 && pixels[i + 3]) ink += 1;
      return ink > 500;
    }), "PDF preview contains visible text and table lines");
    await page.screenshot({ path: `${output}/preview-${width}.png` });
    await page.getByRole("button", { name: "Close preview", exact: true }).click();
  }

  const desktop = await open("Accounts", 1440);
  try {
    const { page } = desktop;
    await page.getByRole("button", { name: "LEGACY-BRANCH", exact: true }).click();
    assert.equal(await page.getByLabel("Issuing branch", { exact: true }).inputValue(), "ub-city");
    assert.ok((await page.locator(".invoice-supplier-details").textContent()).includes("560001"));
    await page.getByRole("button", { name: "All invoices", exact: true }).click();
    await page.getByRole("button", { name: "New Invoice", exact: true }).click();
    assert.equal(await page.getByLabel("Issuing branch", { exact: true }).inputValue(), "ub-city");
    await page.getByRole("button", { name: "Megha reference", exact: true }).click();
    const unchangedFields = () => page.locator(".invoice-editor-details").evaluate((element) => [...element.querySelectorAll("input,select,textarea")].map((field) => field.value));
    const before = await unchangedFields();
    const total = await page.locator(".invoice-balance-total").textContent();
    await page.getByLabel("Issuing branch", { exact: true }).selectOption("banashankari");
    assert.deepEqual(await unchangedFields(), before);
    assert.equal(await page.locator(".invoice-balance-total").textContent(), total);
    assert.ok((await page.locator(".invoice-supplier-details").textContent()).includes("285, 9th Main Road, 26th Cross BSK 2ND Stage"));
    await checkLayout(page);
    await page.screenshot({ path: `${output}/editor-1440.png`, fullPage: true });
    await checkPreview(page, 1440);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Invoice", exact: true }).click();
    const download = await downloading;
    const path = `${output}/banashankari-invoice.pdf`;
    await download.saveAs(path);
    assert.ok((await invoicePdfText(await readFile(path))).includes("Bengaluru 560070"));
    await page.getByRole("button", { name: "Save Invoice", exact: true }).click();
    await page.getByRole("button", { name: "053TTPL2627", exact: true }).waitFor();
    assert.equal(db.state.invoices.find((row) => row.invoiceNo === "053TTPL2627").details.invoiceData.branchId, "banashankari");
  } finally {
    await desktop.context.close();
  }

  for (const width of [390, 320]) {
    const mobile = await open("Super Admin", width);
    try {
      const { page } = mobile;
      await page.getByRole("button", { name: "053TTPL2627", exact: true }).click();
      assert.equal(await page.getByLabel("Issuing branch", { exact: true }).inputValue(), "banashankari");
      await checkLayout(page);
      await page.screenshot({ path: `${output}/editor-${width}.png`, fullPage: true });
      if (width === 390) await checkPreview(page, width);
      await page.getByRole("button", { name: "All invoices", exact: true }).click();
      const downloading = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download invoice 053TTPL2627", exact: true }).click();
      assert.ok((await invoicePdfText(await readFile(await (await downloading).path()))).includes("Bengaluru 560070"));
      await page.getByRole("button", { name: "New Invoice", exact: true }).click();
      assert.equal(await page.getByLabel("Issuing branch", { exact: true }).inputValue(), "ub-city");
    } finally {
      await mobile.context.close();
    }
  }
  assert.deepEqual(pageErrors, []);
});
