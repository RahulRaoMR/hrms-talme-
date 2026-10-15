import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import test from "node:test";

test("both employee entry points share the sign-in design and working OTP reset flow", {
  skip: process.env.EMPLOYEE_LOGIN_BROWSER_TESTS === "1" ? false : "Set EMPLOYEE_LOGIN_BROWSER_TESTS=1 and provide Playwright to run browser checks.",
  timeout: 240000
}, async (t) => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const base = process.env.EMPLOYEE_LOGIN_BASE_URL || "http://localhost:3000";
  const output = "artifacts/employee-login";
  await mkdir(output, { recursive: true });
  let otp = "123456";
  let password = "OldPassword1";
  let emailFailure = false;
  const requests = [];
  await context.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON() || {};
    requests.push({ path, body });
    if (path.endsWith("/password-reset/request")) {
      if (emailFailure) return route.fulfill({ status: 503, json: { error: "Unable to send OTP. Please try again." } });
      return route.fulfill({ json: { email: body.identifier.includes("@") ? body.identifier : "employee@talme.test", message: "OTP sent to your registered email account." } });
    }
    if (path.endsWith("/password-reset/confirm")) {
      if (body.otp !== otp) return route.fulfill({ status: 401, json: { error: "Invalid OTP. Please check your email and try again." } });
      password = body.password;
      assert.equal(body.role, undefined, "password reset must not submit an account role change");
      return route.fulfill({ json: { message: "Password changed successfully. You can sign in with the new password." } });
    }
    if (path === "/api/auth/login") {
      assert.equal(body.role, "employee");
      if (body.password !== password) return route.fulfill({ status: 401, json: { error: "Invalid employee ID or password." } });
      return route.fulfill({ json: { token: "test-only-session", user: { id: "test-user", employeeId: "TTPL-TEST", name: "Test Employee", email: "employee@talme.test", role: "Employee HRMS" } } });
    }
    return route.fulfill({ json: [] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 90000 });
  await page.locator("select").selectOption("employeeHrms");
  await page.waitForURL("**/employee-app/login", { timeout: 90000, waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Employee App", exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.match(await page.getByRole("button", { name: "Sign In", exact: true }).evaluate((button) => getComputedStyle(button).fontFamily), /Arial/i);
  assert.equal(await page.locator(".employee-login-logo img").evaluate((img) => img.complete && img.naturalWidth > 0), true);
  await page.screenshot({ path: `${output}/desktop-sign-in.png`, fullPage: true });
  const employeeId = page.getByLabel("Employee ID", { exact: true });
  const loginPassword = page.getByLabel("Password", { exact: true });
  await employeeId.fill("employee@talme.test");
  await loginPassword.fill("OldPassword1");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  assert.equal(await loginPassword.getAttribute("type"), "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Enter Employee ID, not email." }).waitFor();
  assert.equal(requests.filter((request) => request.path === "/api/auth/login").length, 0);

  await employeeId.fill("TTPL-TEST");
  await page.getByRole("button", { name: "Forgot Password?", exact: true }).click();
  const reset = page.getByRole("form", { name: "Reset password", exact: true });
  assert.equal(await reset.getByLabel("Employee ID", { exact: true }).inputValue(), "TTPL-TEST");
  emailFailure = true;
  await reset.getByRole("button", { name: "Send OTP", exact: true }).click();
  await reset.getByRole("alert").filter({ hasText: "Unable to send OTP" }).waitFor();
  emailFailure = false;
  await reset.getByRole("button", { name: "Send OTP", exact: true }).click();
  await reset.getByRole("heading", { name: "Verify OTP", exact: true }).waitFor();
  await page.screenshot({ path: `${output}/desktop-verify-otp.png`, fullPage: true });
  await reset.getByLabel("OTP", { exact: true }).fill("000000");
  await reset.getByLabel("New Password", { exact: true }).fill("NewPassword2");
  await reset.getByLabel("Confirm Password", { exact: true }).fill("DifferentPassword");
  await reset.getByRole("button", { name: "Reset Password", exact: true }).click();
  await reset.getByRole("alert").filter({ hasText: "must match" }).waitFor();
  assert.equal(requests.filter((request) => request.path.endsWith("/password-reset/confirm")).length, 0);
  await reset.getByLabel("Confirm Password", { exact: true }).fill("NewPassword2");
  await reset.getByRole("button", { name: "Reset Password", exact: true }).click();
  await reset.getByRole("alert").filter({ hasText: "Invalid OTP" }).waitFor();
  otp = "654321";
  await reset.getByRole("button", { name: "Resend OTP", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('input[autocomplete="one-time-code"]')?.value === "");
  await reset.getByLabel("OTP", { exact: true }).fill(otp);
  await reset.getByRole("button", { name: "Reset Password", exact: true }).click();
  await reset.getByRole("heading", { name: "Password Updated", exact: true }).waitFor();
  await reset.getByRole("button", { name: "Back to Sign In", exact: true }).click();
  assert.equal(await loginPassword.inputValue(), "NewPassword2");
  const destinationRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/employee-app" && url.searchParams.get("employeeId") === "TTPL-TEST";
  });
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await destinationRequest;
  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem("talme-suite-session")));
  assert.equal(session.user.role, "Employee HRMS");
  assert.equal(session.destination, "/employee-app?employeeId=TTPL-TEST");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("talme-employee-app-employee-id")), "TTPL-TEST");

  for (const [name, width] of [["mobile", 390], ["mobile-small", 320]]) {
    await page.goto(`${base}/employee-app/login`, { waitUntil: "networkidle", timeout: 90000 });
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("button", { name: "Forgot Password?", exact: true }).waitFor();
    await page.screenshot({ path: `${output}/${name}-sign-in.png`, fullPage: true });
    await page.getByRole("button", { name: "Forgot Password?", exact: true }).click();
    await reset.getByLabel("Employee ID", { exact: true }).fill("TTPL-TEST");
    await page.screenshot({ path: `${output}/${name}-request-otp.png`, fullPage: true });
    await reset.getByRole("button", { name: "Send OTP", exact: true }).click();
    await reset.getByRole("heading", { name: "Verify OTP", exact: true }).waitFor();
    await page.screenshot({ path: `${output}/${name}-verify-otp.png`, fullPage: true });
    const problems = await page.evaluate(() => {
      const problems = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) problems.push("Horizontal overflow");
      let bottom = -Infinity;
      for (const node of document.querySelectorAll(".shared-password-reset > *")) {
        const box = node.getBoundingClientRect();
        if (box.top < bottom - 1) problems.push("Overlapping reset fields");
        bottom = box.bottom;
      }
      return problems;
    });
    assert.deepEqual(problems, [], name);
  }

  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 90000 });
  await page.getByRole("button", { name: "Forgot Password?", exact: true }).click();
  await reset.getByLabel("Registered Email", { exact: true }).fill("director@talme.test");
  await reset.getByRole("button", { name: "Send OTP", exact: true }).click();
  await reset.getByRole("heading", { name: "Verify OTP", exact: true }).waitFor();
  assert.equal(requests.at(-1).body.role, "admin");
  assert.equal(await page.locator("form form").count(), 0);
  assert.deepEqual(errors, [], "Login screens must not produce runtime errors");
});
