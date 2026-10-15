import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdir } from "node:fs/promises";
import test from "node:test";
import env from "@next/env";

test("authorized accounts share the invoice register and rejected sessions recover through sign-in", {
  skip: process.env.INVOICE_ACCESS_BROWSER_TESTS === "true" ? false : "Set INVOICE_ACCESS_BROWSER_TESTS=true and provide Playwright to run browser checks.",
  timeout: 240000
}, async (t) => {
  env.loadEnvConfig(process.cwd(), true);
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  t.after(() => browser.close());
  const base = process.env.INVOICE_TEST_BASE_URL || "http://localhost:3000";
  const output = "artifacts/invoice-access";
  await mkdir(output, { recursive: true });

  const sessionFor = (role, expiresAt = Date.now() + 120000) => {
    const user = { email: "invoice-browser-check@example.test", name: "Invoice Access Review", role };
    const payload = Buffer.from(JSON.stringify({ user, expiresAt })).toString("base64url");
    return { user, token: `${payload}.${crypto.createHmac("sha256", process.env.AUTH_SECRET || "talme-dev-secret").update(payload).digest("base64url")}` };
  };
  async function openContext(session, { rejected = false, width = 1440 } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript((session) => {
      if (!sessionStorage.getItem("invoice-browser-seeded")) {
        sessionStorage.setItem("talme-suite-session", JSON.stringify(session));
        sessionStorage.setItem("invoice-browser-seeded", "true");
      }
      localStorage.setItem("talme-theme-mode", "light");
    }, session);
    let authRejected = rejected;
    await context.route("**/api/**", (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === "/api/auth/login") {
        authRejected = false;
        return route.fulfill({ json: sessionFor("Accounts") });
      }
      if (request.method() === "GET" && (path === "/api/invoices" || path.startsWith("/api/invoices/") || path === "/api/invoice-documents" || path === "/api/auth/session")) {
        return authRejected && path === "/api/invoices"
          ? route.fulfill({ status: 401, json: { error: "Please sign in again." } })
          : route.continue();
      }
      // Never submit audit, legacy-sync, or invoice mutations against real data.
      return route.fulfill({ json: [] });
    });
    return context;
  }

  let reference;
  for (const role of ["Accounts", "Invoice", "Super Admin", "Enterprise Admin", "Finance Approver"]) {
    const context = await openContext(sessionFor(role));
    try {
      const page = await context.newPage();
      const result = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/invoices" && response.request().method() === "GET");
      await page.goto(`${base}/invoices`, { waitUntil: "networkidle", timeout: 90000 });
      const response = await result;
      assert.equal(response.status(), 200, role);
      const rows = await response.json();
      if (!reference) reference = rows.map((row) => row.id);
      assert.deepEqual(rows.map((row) => row.id), reference, `${role}: same shared invoices`);
      await page.waitForFunction((count) => document.querySelector(".invoice-count")?.textContent === String(count), rows.length);
      assert.equal(await page.locator(".invoice-list-alert").count(), 0);
      if (role === "Accounts" || role === "Super Admin") await page.screenshot({ path: `${output}/${role.toLowerCase().replaceAll(" ", "-")}.png`, fullPage: true });
    } finally {
      await context.close();
    }
  }

  for (const width of [1440, 390]) {
    const context = await openContext({ user: { email: "invoice-browser-check@example.test", role: "Accounts" }, token: "unrecognized-session" }, { rejected: true, width });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/invoices`, { waitUntil: "networkidle", timeout: 90000 });
      await page.getByText("Sign in to view the shared invoices", { exact: true }).waitFor();
      assert.equal(await page.locator(".invoice-count").textContent(), "\u2014");
      assert.equal(await page.getByText("0 invoices", { exact: true }).count(), 0);
      await page.screenshot({ path: `${output}/sign-in-required-${width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.locator(".invoice-register-empty").getByRole("link", { name: "Sign In", exact: true }).click();
      await page.waitForURL("**/login?next=%2Finvoices", { waitUntil: "networkidle", timeout: 90000 });
      await page.locator("select").selectOption("invoice");
      await page.getByLabel("Corporate Email", { exact: true }).fill("invoice-browser-check@example.test");
      await page.getByLabel("Password", { exact: true }).fill("Test-Only-Password");
      const result = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/invoices");
      await page.getByRole("button", { name: "Enter Suite", exact: true }).click();
      await page.waitForURL("**/invoices", { timeout: 90000 });
      assert.equal((await result).status(), 200);
      await page.waitForFunction((count) => document.querySelector(".invoice-count")?.textContent === String(count), reference.length);
    } finally {
      await context.close();
    }
  }

  const expired = await openContext(sessionFor("Accounts", Date.now() - 1000));
  try {
    const page = await expired.newPage();
    await page.goto(`${base}/invoices`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForURL("**/login?next=%2Finvoices", { timeout: 90000 });
    assert.equal(await page.evaluate(() => sessionStorage.getItem("talme-suite-session")), null);
  } finally {
    await expired.close();
  }
});
