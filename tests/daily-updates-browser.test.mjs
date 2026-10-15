import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import test from "node:test";

test("daily updates lists the employee directory, filters posts, and refreshes new employees", {
  skip: process.env.DAILY_UPDATES_BROWSER_TESTS === "1" ? false : "Set DAILY_UPDATES_BROWSER_TESTS=1 and provide Playwright to run browser checks.",
  timeout: 180000
}, async (t) => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"]
  });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const employees = [
    { id: "1", employeeId: "TTPL-1", name: "Pooja", email: "pooja@talme.test" },
    { id: "2", employeeId: "TTPL-2", name: "Amrutha", email: "amrutha@talme.test" },
    { id: "3", employeeId: "TTPL-3", name: "Nandhini", email: "nandhini@talme.test" },
    { id: "4", employeeId: "TTPL-4", name: "Harshitha", email: "harshitha@talme.test" },
    { id: "5", employeeId: "TTPL-5", name: "Employee Without Email" },
    ...Array.from({ length: 75 }, (_, index) => ({ id: `extra-${index}`, name: `Employee ${index + 1}`, email: `employee${index}@talme.test` }))
  ];
  const updates = [
    { id: "post-1", authorName: "Pooja", authorEmail: "pooja@talme.test", message: "My worklog fixture", createdAt: new Date().toISOString() },
    { id: "post-2", authorName: "Harshitha", authorEmail: " HARSHITHA@talme.test ", message: "Harshitha worklog fixture", createdAt: new Date().toISOString() },
    { id: "post-3", authorName: "Former Colleague", authorEmail: "former@talme.test", message: "Former colleague fixture", createdAt: new Date().toISOString() },
    { id: "post-4", authorName: "Employee Without Email", authorEmail: "ttpl-5", message: "Employee ID worklog fixture", createdAt: new Date().toISOString() }
  ];
  let directoryFails = false;
  await context.addInitScript(() => {
    sessionStorage.setItem("talme-suite-session", JSON.stringify({
      user: { name: "Pooja", email: "pooja@talme.test", role: "Super Admin" }, token: "layout-test-token"
    }));
    localStorage.setItem("talme-theme-mode", "light");
  });
  await context.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/employees" && directoryFails) return route.fulfill({ status: 503, json: { error: "Directory unavailable" } });
    return route.fulfill({ json: path === "/api/employees" ? employees : path === "/api/daily-updates" ? updates : [] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${process.env.DAILY_UPDATES_BASE_URL || "http://localhost:3000"}/daily-updates`, { waitUntil: "domcontentloaded", timeout: 90000 });
  const user = page.getByLabel("User", { exact: true });
  const options = user.locator("option");
  await page.waitForFunction((count) => document.querySelector(".daily-filters label:last-child select")?.options.length === count, employees.length + 2);
  assert.deepEqual((await options.allTextContents()).slice(0, 2), ["Everyone", "Myself"]);
  assert.equal(await options.filter({ hasText: /^Harshitha$/ }).count(), 1);
  assert.equal(await options.filter({ hasText: /^Pooja$/ }).count(), 0);

  await user.selectOption("amrutha@talme.test");
  await page.getByText("No updates found.", { exact: true }).waitFor();
  await user.selectOption("harshitha@talme.test");
  await page.getByText("Harshitha worklog fixture", { exact: true }).waitFor();
  assert.equal(await page.locator(".daily-update-card").count(), 1);
  await user.selectOption("mine");
  await page.getByText("My worklog fixture", { exact: true }).waitFor();
  assert.equal(await page.locator(".daily-update-card").count(), 1);
  await user.selectOption("ttpl-5");
  await page.getByText("Employee ID worklog fixture", { exact: true }).waitFor();

  employees[4].email = "newemail@talme.test";
  employees.push({ id: "new", name: "New Employee", email: "new@talme.test" });
  await page.getByRole("button", { name: "Refresh updates" }).click();
  await page.waitForFunction(() => document.querySelector(".daily-filters label:last-child select")?.value === "newemail@talme.test");
  assert.equal(await options.filter({ hasText: /^New Employee$/ }).count(), 1);
  assert.equal(await page.locator(".daily-update-card").count(), 1);
  await page.getByRole("button", { name: "Clear All", exact: true }).click();
  await page.getByText("Former colleague fixture", { exact: true }).waitFor();
  assert.equal(await user.inputValue(), "all");
  assert.equal(await page.locator(".daily-update-card").count(), 4);

  const output = "artifacts/daily-update-users";
  await mkdir(output, { recursive: true });
  for (const [name, width] of [["desktop", 1440], ["mobile", 390], ["mobile-small", 320]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, `${name}: page must not overflow horizontally`);
  }

  directoryFails = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("alert").filter({ hasText: "Unable to load the employee list" }).waitFor();
  await page.getByText("Harshitha worklog fixture", { exact: true }).waitFor();
  directoryFails = false;
  await page.getByRole("button", { name: "Refresh updates" }).click();
  await options.filter({ hasText: /^Amrutha$/ }).waitFor({ state: "attached" });
  await page.getByRole("alert").filter({ hasText: "Unable to load the employee list" }).waitFor({ state: "hidden" });
  assert.deepEqual(errors, [], "The page must render without runtime errors");
});
