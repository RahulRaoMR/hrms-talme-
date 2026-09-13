import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../backend/package.json", import.meta.url));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const dotenv = require("dotenv");
const backendEnv = dotenv.parse(fs.readFileSync(new URL("../backend/.env", import.meta.url)));
const frontendEnv = { ...dotenv.parse(fs.readFileSync(new URL("../.env", import.meta.url))), ...dotenv.parse(fs.readFileSync(new URL("../.env.local", import.meta.url))) };
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ datasourceUrl: backendEnv.DATABASE_URL });
const employeeId = `TEST-UI-${crypto.randomUUID()}`;
function session(role, env) {
  const user = { email: `${role === "HR" ? "reviewer" : "employee"}@example.invalid`, role, employeeId: role === "HR" ? "TEST-REVIEWER" : employeeId };
  const payload = Buffer.from(JSON.stringify({ user, expiresAt: Date.now() + 600000 })).toString("base64url");
  return { user, token: `${payload}.${crypto.createHmac("sha256", env.AUTH_SECRET || "talme-dev-secret").update(payload).digest("base64url")}` };
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const errors = [];
try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobile.addInitScript(value => sessionStorage.setItem("talme-suite-session", JSON.stringify(value)), session("Employee", backendEnv));
  await mobile.route("**/api/activity", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const employee = await mobile.newPage();
  employee.on("pageerror", error => errors.push(error.message));
  employee.on("console", message => { if (message.type() === "error") console.error(message.text()); });
  employee.on("requestfailed", request => console.error("Request failed:", request.url(), request.failure()?.errorText));
  await employee.goto(`http://localhost:3000/employee-app?employeeId=${employeeId}`);
  await employee.locator(".phone-bottom-nav button").filter({ hasText: "Calendar" }).click();
  const day = Math.max(1, new Date().getDate() - 1);
  await employee.locator(".calendar-grid").getByRole("button", { name: String(day), exact: true }).click();
  async function addPunch(reason) {
    await employee.getByRole("button", { name: "Add Punch", exact: true }).click();
    await employee.locator(".regularization-time-field").click();
    await employee.getByRole("button", { name: "Apply", exact: true }).click();
    await employee.getByPlaceholder("Write your reason").fill(reason);
    console.log("Submitting Add Punch form.");
    const [response] = await Promise.all([
      employee.waitForResponse(response => response.url().endsWith("/api/punch-activity") && response.request().method() === "POST"),
      employee.getByRole("button", { name: "Add Punch Time", exact: true }).click()
    ]);
    assert.ok(response.ok(), await response.text());
    await employee.getByRole("dialog", { name: "Add New Time" }).waitFor({ state: "hidden" });
    return response.json();
  }
  const first = await addPunch("Browser acceptance test");
  console.log("Employee Add Punch submitted.");
  assert.equal(first.regularizationStatus, "Pending");
  assert.equal(await employee.locator(".regularization-activity .activity-row").count(), 0);
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await adminContext.addInitScript(value => sessionStorage.setItem("talme-suite-session", JSON.stringify(value)), session("HR", frontendEnv));
  await adminContext.route("**/api/activity", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const admin = await adminContext.newPage();
  admin.on("pageerror", error => errors.push(error.message));
  await admin.goto("http://localhost:3000/shifts");
  let row = admin.locator(".punch-review-table tbody tr").filter({ hasText: employeeId });
  await row.getByRole("button", { name: "Accept", exact: true }).waitFor();
  console.log("Request visible in Manage Shifts.");
  await admin.locator(".punch-review-section").scrollIntoViewIfNeeded();
  await admin.screenshot({ path: "regularization-admin-verified.png" });
  await row.getByRole("button", { name: "Accept", exact: true }).click();
  await row.waitFor({ state: "hidden" });
  await employee.evaluate(() => window.dispatchEvent(new Event("focus")));
  await employee.locator(".pending-regularization-card").filter({ hasText: "Accepted" }).waitFor();
  console.log("Accepted status visible to employee.");
  assert.equal(await employee.locator(".regularization-activity .activity-row").count(), 1);
  const second = await addPunch("Browser decline test");
  assert.notEqual(second.id, first.id);
  await admin.evaluate(() => window.dispatchEvent(new Event("focus")));
  row = admin.locator(".punch-review-table tbody tr").filter({ hasText: employeeId });
  await row.getByRole("button", { name: "Decline", exact: true }).click();
  await admin.getByRole("dialog").getByRole("textbox").fill("Please check the requested time.");
  await admin.getByRole("dialog").getByRole("button", { name: "Decline", exact: true }).click();
  await admin.getByRole("dialog").waitFor({ state: "hidden" });
  await employee.evaluate(() => window.dispatchEvent(new Event("focus")));
  await employee.locator(".pending-regularization-card").filter({ hasText: "Declined" }).waitFor();
  assert.equal(await employee.locator(".regularization-activity .activity-row").count(), 1);
  assert.ok(await employee.getByText("Please check the requested time.", { exact: false }).count());
  await employee.screenshot({ path: "regularization-employee-verified.png", fullPage: true });
  await admin.setViewportSize({ width: 390, height: 844 });
  await admin.getByLabel("Status", { exact: true }).selectOption("All");
  await admin.locator(".punch-review-section").scrollIntoViewIfNeeded();
  await admin.screenshot({ path: "regularization-admin-mobile-verified.png" });
  assert.deepEqual(errors, []);
  console.log("PASS: employee Add Punch UI, HR Accept/Decline UI, employee status and decline reason, inactive-punch exclusion, desktop/mobile rendering, no browser errors.");
} catch (error) {
  let index = 0;
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      await page.screenshot({ path: `regularization-test-failure-${index++}.png` }).catch(() => {});
      console.error("Browser failure:", page.url(), (await page.locator("body").innerText()).slice(-2500));
    }
  }
  throw error;
} finally {
  await browser.close();
  const rows = await db.punchActivity.findMany({ where: { employeeId }, select: { id: true } });
  await db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: [...rows.map(row => row.id), employeeId] } }, { detail: { contains: employeeId } }] } });
  await db.punchActivity.deleteMany({ where: { employeeId } });
  await db.$disconnect();
}
