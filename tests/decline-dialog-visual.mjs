import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/royal/.vscode/extensions/danielsanmedium.dscodegpt-3.24.62/standalone/node_modules/patchright-core");

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Users/royal/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe"
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(() => {
    sessionStorage.setItem("talme-suite-session", JSON.stringify({
      token: "test-token",
      user: { email: "hr@example.invalid", role: "HR", employeeId: "TTPL-HR" }
    }));
  });
  await context.route("**/api/punch-activity/regularizations", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{
      id: "preview-request",
      employeeId: "TTPL-0030",
      employeeName: "Rahul Rao M R",
      type: "Punch Out",
      time: "03:02 pm",
      workDate: "2026-09-01",
      reason: "Add a missing punch",
      regularizationStatus: "Pending"
    }])
  }));
  await context.route("**/api/punch-activity/preview-request/review", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}"
  }));

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://localhost:3000/shifts");
  await page.getByRole("button", { name: "Decline", exact: true }).click();

  const dialog = page.locator(".punch-review-confirm-dialog");
  await dialog.waitFor();
  const styles = await dialog.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
    overlayPosition: getComputedStyle(element.parentElement).position
  }));
  const bounds = await dialog.boundingBox();
  await page.screenshot({ path: "decline-dialog-verified.png", fullPage: false });
  await dialog.screenshot({ path: "decline-dialog-content-verified.png" });

  console.log(JSON.stringify({
    styles,
    bounds,
    heading: await dialog.getByRole("heading", { name: "Decline Request" }).isVisible(),
    textarea: await dialog.getByPlaceholder("Add context for the employee").isVisible(),
    buttons: await dialog.getByRole("button").count(),
    errors
  }));
} finally {
  await browser.close();
}
