import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import test from "node:test";

const enabled = process.env.DASHBOARD_LAYOUT_BROWSER_TESTS === "1";
const outputDir = process.env.DASHBOARD_LAYOUT_ARTIFACTS || "artifacts/dashboard-layout";
const names = [
  "JOY MUKHERJEE BHIMANA", "Saikumar", "Santosh Shanbhag", "MD DANISH HUSSAIN",
  "Basala Chandu Yadav", "Abhinav Saxena",
  "Alexandra Christine Subramanian Recruitment Operations Coordinator",
  "averylongunbrokennameforregressiontesting@example.talme.test"
];

function dashboardFixture(count) {
  const records = Array.from({ length: count }, (_, index) => ({
    id: `layout-${index}`,
    name: names[index % names.length],
    role: index < 6 ? "Windows system administrator" : "Senior enterprise systems administrator and recruitment operations specialist",
    href: `/ats?candidate=layout-${index}`
  }));
  return {
    generatedAt: "2026-10-15T10:00:00.000Z",
    range: { key: "30d", label: "30 Days" },
    visibleWidgets: [
      { id: "recruitment", title: "Recruitment Overview" },
      { id: "operations", title: "Daily Operations" },
      { id: "activity", title: "Activity Timeline" }
    ],
    hero: [], kpis: [], attendance: {}, employeeStats: {}, payrollStats: {},
    leaveShift: {}, approvalCenter: [], insights: [], vendorSummary: {}, performance: {},
    reports: [], loans: {}, documentCenter: {}, notifications: [], systemHealth: {},
    recruitment: { upcomingInterviews: records, recentCandidates: records },
    operations: { meetings: records, updates: records, joining: records, exits: records },
    activity: records.map((record, index) => ({
      label: index % 2 ? record.name : `${record.name.toLowerCase().replaceAll(" ", "")}@talme.test (Payroll + ATS)`,
      time: "2026-10-15T10:00:00.000Z",
      value: index < 6 ? "Interview updated" : "Updated recruitment and payroll access for the enterprise operations team",
      href: record.href,
      tone: index % 2 ? "teal" : "gold"
    }))
  };
}

test("dashboard lists keep all text inside naturally sized, scrollable rows", {
  skip: enabled ? false : "Set DASHBOARD_LAYOUT_BROWSER_TESTS=1 and provide Playwright to run browser checks.",
  timeout: 240000
}, async (t) => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"]
  });
  t.after(() => browser.close());
  await mkdir(outputDir, { recursive: true });

  for (const scenario of [
    { name: "desktop", width: 1440, height: 1000, count: 6 },
    { name: "desktop-long", width: 1440, height: 1000, count: 32 },
    { name: "tablet", width: 1024, height: 900, count: 32 },
    { name: "mobile", width: 390, height: 844, count: 32 },
    { name: "mobile-small", width: 320, height: 780, count: 32 },
    { name: "desktop-zoom", width: 1440, height: 1000, count: 32, zoom: 1.25 }
  ]) {
    await t.test(scenario.name, async () => {
      const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height } });
      try {
        await context.addInitScript(() => {
          sessionStorage.setItem("talme-suite-session", JSON.stringify({
            user: { email: "layout@talme.test", name: "Layout Review", role: "Super Admin" },
            token: "layout-test-token"
          }));
          localStorage.setItem("talme-theme-mode", "light");
        });
        await context.route("**/api/**", (route) => {
          const path = new URL(route.request().url()).pathname;
          if (path === "/api/dashboard/stream") return route.fulfill({ status: 503, body: "" });
          return route.fulfill({
            json: path === "/api/dashboard" ? dashboardFixture(scenario.count) : []
          });
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${process.env.DASHBOARD_LAYOUT_BASE_URL || "http://localhost:3000"}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90000 });
        const interviews = page.getByLabel("Upcoming Interviews", { exact: true });
        await interviews.locator("a").first().waitFor({ timeout: 60000 });
        await page.evaluate((zoom) => {
          if (zoom) document.body.style.zoom = zoom;
          document.body.style.setProperty("scroll-behavior", "auto");
        }, scenario.zoom);
        await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${outputDir}/${scenario.name}.png`, fullPage: true });

        const problems = await page.evaluate((expectedCount) => {
          const problems = [];
          if (document.documentElement.scrollWidth > window.innerWidth + 1) problems.push("Page overflows horizontally");
          for (const list of document.querySelectorAll(".dashboard-list, .dashboard-timeline")) {
            const label = list.getAttribute("aria-label");
            const rows = [...list.querySelectorAll(":scope > a")];
            if (rows.length !== expectedCount) problems.push(`${label}: expected ${expectedCount} rows, found ${rows.length}`);
            if (list.scrollWidth > list.clientWidth + 1) problems.push(`${label}: list overflows horizontally`);
            let previousBottom = -Infinity;
            for (const [index, row] of rows.entries()) {
              const box = row.getBoundingClientRect();
              const prefix = `${label} row ${index + 1}`;
              if (box.top < previousBottom - 1) problems.push(`${prefix}: overlaps previous row`);
              previousBottom = box.bottom;
              let textBottom = box.top;
              for (const child of row.children) {
                const childBox = child.getBoundingClientRect();
                if (childBox.top < textBottom - 1) problems.push(`${prefix}: text overlaps`);
                if (childBox.bottom > box.bottom - 5 || childBox.top < box.top + 5) problems.push(`${prefix}: text outside row`);
                if (childBox.left < box.left || childBox.right > box.right + 1) problems.push(`${prefix}: text exceeds row width`);
                if (child.scrollHeight > child.clientHeight + 1 || child.scrollWidth > child.clientWidth + 1) problems.push(`${prefix}: clipped text`);
                textBottom = childBox.bottom;
              }
            }
            list.scrollTop = list.scrollHeight;
            const last = rows.at(-1)?.getBoundingClientRect();
            const bounds = list.getBoundingClientRect();
            if (last && last.bottom > bounds.bottom + 1) problems.push(`${label}: final row cannot be reached`);
            list.scrollTop = 0;
          }
          return problems;
        }, Math.min(scenario.count, 30));
        assert.equal(problems.length, 0, problems.slice(0, 15).join("\n"));
        assert.deepEqual(errors, [], "Dashboard must render without runtime errors");
        assert.equal(await interviews.locator("a").first().getAttribute("href"), "/ats?candidate=layout-0");

        for (const [label, filename] of [["Today's Meetings", "meetings"], ["Recent activity", "timeline"]]) {
          await page.getByLabel(label, { exact: true }).screenshot({ path: `${outputDir}/${scenario.name}-${filename}.png` });
        }
      } finally {
        await context.close();
      }
    });
  }
});
