import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

test("employee mobile persistent login, restart, refresh, logout, revocation and corporate regression", {
  skip: process.env.EMPLOYEE_MOBILE_BROWSER_TESTS !== "true" && "Set EMPLOYEE_MOBILE_BROWSER_TESTS=true with the isolated frontend/backend and database.",
  timeout: 300000
}, async (t) => {
  process.loadEnvFile(path.resolve("backend/.env"));
  const db = new PrismaClient();
  const id = `MOBILE-CHECK-${crypto.randomUUID().slice(0, 8)}`;
  const employeeId = id;
  const password = `Test!${crypto.randomBytes(18).toString("hex")}`;
  const email = `${id.toLowerCase()}@example.test`;
  const name = `Mobile Check ${id}`;
  const output = "artifacts/employee-mobile-session";
  await mkdir(output, { recursive: true });
  const account = await db.user.create({ data: { name, email, role: "Employee", active: true, passwordHash: await bcrypt.hash(password, 4) } });
  await db.employee.create({ data: { employeeId, name, email, department: "Validation", location: "Bengaluru", manager: "Test Manager", grade: "Engineer", joiningDate: "2026-10-22", salaryBand: "0", salaryNetPay: 0, bankStatus: "Pending", status: "Active", tone: "green" } });
  const corporate = [];
  t.after(async () => {
    await db.auditLog.deleteMany({ where: { actor: { in: [email, employeeId, ...corporate.map((user) => user.email)] } } });
    await db.user.deleteMany({ where: { id: { in: [account.id, ...corporate.map((user) => user.id)] } } });
    await db.employee.deleteMany({ where: { employeeId } });
    await db.$disconnect();
  });
  const base = process.env.EMPLOYEE_MOBILE_BASE_URL || "http://127.0.0.1:3100";
  const backend = process.env.EMPLOYEE_MOBILE_BACKEND_URL || "http://127.0.0.1:4100";
  const api = async (url, data, token) => {
    const response = await fetch(url, { method: data ? "POST" : "GET", headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, body: await response.json() };
  };
  for (const host of [base, backend]) assert.equal((await api(`${host}/api/employee-mobile/session`)).status, 401);
  const login = await api(`${base}/api/auth/login`, { email: employeeId, password, role: "employee" });
  assert.equal(login.status, 200);
  const device = await api(`${base}/api/employee-mobile/sessions`, {}, login.body.token);
  assert.equal(device.status, 201);
  const ownData = await api(`${base}/api/employee-mobile/hrms`, null, device.body.token);
  assert.equal(ownData.status, 200);
  assert.deepEqual(ownData.body.employees.map((employee) => employee.employeeId), [employeeId]);
  assert.deepEqual(ownData.body.settings, [], "Company administration settings are not sent to the Employee App.");
  assert.deepEqual(ownData.body.settings, [], "Company administration settings are not sent to the Employee App.");
  assert.equal((await api(`${base}/api/employee-mobile/punch-activity?employeeId=ANOTHER`, null, device.body.token)).status, 403);
  const expiredPayload = JSON.parse(Buffer.from(device.body.token.split(".")[0], "base64url").toString());
  expiredPayload.expiresAt = Date.now() - 1000;
  const expiredEncoded = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expiredSignature = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(expiredEncoded).digest("base64url");
  assert.equal((await api(`${backend}/api/hrms`, null, `${expiredEncoded}.${expiredSignature}`)).status, 401, "Expired mobile access is rejected on existing backend routes as well.");
  const refreshes = await Promise.all(Array.from({ length: 6 }, () => api(`${base}/api/employee-mobile/refresh`, { refreshToken: device.body.refreshToken })));
  assert.ok(refreshes.every((response) => response.status === 200));
  assert.equal(new Set(refreshes.map((response) => response.body.refreshToken)).size, 1);
  const rotated = refreshes[0].body;
  assert.equal((await api(`${base}/api/employee-mobile/logout`, { refreshToken: rotated.refreshToken })).status, 200);
  assert.equal((await api(`${backend}/api/punch-activity?employeeId=${employeeId}`, null, rotated.token)).status, 401);
  assert.equal((await api(`${base}/api/employee-mobile/refresh`, { refreshToken: rotated.refreshToken })).status, 401);

  for (const [role, selection] of [["Enterprise Admin", "admin"], ["HR", "hr"]]) {
    const user = await db.user.create({ data: { email: `${selection}-${email}`, name: `Test ${role}`, role, active: true, passwordHash: await bcrypt.hash(password, 4) } });
    corporate.push(user);
    const result = await api(`${base}/api/auth/login`, { email: user.email, password, role: selection });
    assert.equal(result.status, 200, `${role} login remains functional`);
    const claims = JSON.parse(Buffer.from(result.body.token.split(".")[0], "base64url").toString());
    assert.ok(claims.expiresAt - Date.now() > 11 * 3600000);
    assert.equal(claims.user.employeeMobileSessionId, undefined);
    assert.equal((await api(`${base}/api/employee-mobile/sessions`, {}, result.body.token)).status, 403);
    assert.equal((await api(`${base}/api/auth/session`, null, result.body.token)).status, 200);
  }

  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  t.after(() => browser.close());
  let credential = "";
  let loginRequests = 0;
  let refreshRequests = 0;
  const errors = [];
  const nativeContexts = [];
  t.after(async () => { for (const context of nativeContexts) await context.close().catch(() => {}); });
  const open = async ({ unavailable = false } = {}) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 TalmeEmployeeApp/1.0.5" });
    nativeContexts.push(context);
    // Only the Android bridge is emulated. Login, refresh, protected data and
    // logout use the actual Next/Express services and PostgreSQL fixture user.
    await context.exposeBinding("employeeNative", async (_source, method, options) => {
      if (method === "read") return { credential };
      if (method === "write") { credential = options.credential; return {}; }
      if (method === "clear") { credential = ""; return {}; }
      throw new Error("Unknown native operation");
    });
    await context.addInitScript(() => {
      window.androidBridge = { postMessage() {} };
      window.Capacitor = { PluginHeaders: [{ name: "EmployeeSession", methods: ["read", "write", "clear"].map((name) => ({ name, rtype: "promise" })) }], nativePromise: (_plugin, method, options) => window.employeeNative(method, options) };
      window.loginFormPaints = 0;
      new MutationObserver(() => { if (document.querySelector('input[autocomplete="current-password"]')) window.loginFormPaints++; }).observe(document, { childList: true, subtree: true });
    });
    context.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/auth/login" && request.method() === "POST") loginRequests++;
      if (pathname === "/api/employee-mobile/refresh") refreshRequests++;
    });
    if (unavailable) await context.route("**/api/employee-mobile/refresh", (route) => route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } }));
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/employee-app/login`, { waitUntil: "domcontentloaded" });
    return { page, context };
  };
  const signIn = async (page) => {
    await page.getByLabel("Employee ID", { exact: true }).fill(employeeId);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.getByRole("heading", { name, exact: true }).waitFor({ timeout: 60000 });
  };

  let { page, context } = await open();
  await signIn(page);
  assert.ok(credential.includes("refreshToken"));
  assert.equal(credential.includes(password), false);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("talme-suite-session")), null);
  await page.screenshot({ path: `${output}/first-login-dashboard.png` });
  const beforeReload = loginRequests;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name, exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.loginFormPaints), 0);
  assert.equal(loginRequests, beforeReload);
  await context.close();

  ({ page, context } = await open());
  await page.getByRole("heading", { name, exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.loginFormPaints), 0);
  assert.equal(loginRequests, beforeReload);
  await page.goto(`${base}/employee-app/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name, exact: true }).waitFor();
  assert.equal(loginRequests, beforeReload);
  await page.screenshot({ path: `${output}/reopened-without-sign-in.png` });
  await context.close();

  const saved = credential;
  ({ page, context } = await open({ unavailable: true }));
  await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
  assert.equal(await page.getByLabel("Password", { exact: true }).count(), 0);
  assert.equal(credential, saved);
  await page.screenshot({ path: `${output}/connection-error-keeps-session.png` });
  await context.unroute("**/api/employee-mobile/refresh");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByRole("heading", { name, exact: true }).waitFor();

  const beforeExpiry = refreshRequests;
  let expiredBearer = "";
  await context.route("**/api/employee-mobile/**", async (route) => {
    const header = route.request().headers().authorization;
    if (!header) return route.continue();
    if (!expiredBearer) expiredBearer = header;
    if (header !== expiredBearer) return route.continue();
    const payload = JSON.parse(Buffer.from(header.replace(/^Bearer /, "").split(".")[0], "base64url").toString());
    payload.expiresAt = Date.now() - 1000;
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(encoded).digest("base64url");
    return route.continue({ headers: { ...route.request().headers(), authorization: `Bearer ${encoded}.${signature}` } });
  });
  const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/employee-mobile/refresh" && response.status() === 200);
  await page.evaluate(() => { for (let n = 0; n < 4; n++) window.dispatchEvent(new Event("focus")); });
  await refreshed;
  await page.waitForTimeout(1500);
  assert.equal(refreshRequests - beforeExpiry, 1, "Concurrent expired access refreshes once.");
  await page.getByRole("heading", { name, exact: true }).waitFor();
  assert.equal(loginRequests, beforeReload);
  await context.unroute("**/api/employee-mobile/**");

  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.locator("button.logout").click();
  await page.getByRole("button", { name: "Sign In", exact: true }).waitFor();
  assert.equal(credential, "");
  await context.close();
  ({ page, context } = await open());
  await page.getByRole("button", { name: "Sign In", exact: true }).waitFor();
  await signIn(page);
  await context.close();
  const sessionId = JSON.parse(credential).refreshToken.split(".")[0];
  await db.employeeMobileSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  ({ page, context } = await open());
  await page.getByRole("button", { name: "Sign In", exact: true }).waitFor();
  assert.equal(credential, "");
  await signIn(page);
  await db.user.update({ where: { id: account.id }, data: { active: false } });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("button", { name: "Sign In", exact: true }).waitFor({ timeout: 60000 });
  assert.equal(credential, "");
  assert.equal(await page.locator(".phone-app-shell").count(), 0);
  await page.screenshot({ path: `${output}/disabled-account-signed-out.png` });
  assert.deepEqual(errors, []);
  await context.close();
});
