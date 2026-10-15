import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate as nextTurn } from "node:timers/promises";
import test from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { normalizeDashboardRole } from "../lib/dashboard-roles.mjs";
import { buildPayrollSummary } from "../lib/payroll-summary.js";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";

function deferred() {
  return Promise.withResolvers();
}

async function loadModule(file, dependencies, globals = {}) {
  const context = createContext({
    AbortController, Request, Response, ReadableStream, TextEncoder, URL, Buffer,
    console, process: { env: { NODE_ENV: "test" } },
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (...args) => clearTimeout(...args),
    setInterval: (...args) => setInterval(...args),
    clearInterval: (...args) => clearInterval(...args),
    ...globals
  });
  const module = new SourceTextModule(await readFile(new URL(file, import.meta.url), "utf8"), { context });
  await module.link(async (specifier) => {
    const exports = dependencies[specifier] ?? await import(specifier);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

function loadData(listPersistentResource, getResource = () => []) {
  return loadModule("../lib/dashboard-data.js", {
    "./punch-status.js": { isActivePunch: () => true },
    "@/lib/local-api-store": { getResource },
    "@/lib/payroll-summary": { buildPayrollSummary },
    "@/lib/prisma-store": { listPersistentResource },
    "@/lib/dashboard-roles.mjs": { normalizeDashboardRole }
  });
}

function loadRoute(file, getDashboardData) {
  return loadModule(file, {
    "@/lib/dashboard-data": { getDashboardData },
    "@/lib/dashboard-roles.mjs": { normalizeDashboardRole }
  });
}

const streamFile = "../app/api/dashboard/stream/route.js";
const streamPayload = { visibleWidgets: [{ id: "kpis" }] };

test("concurrent dashboards share reads and leave database pool capacity available", async () => {
  let active = 0;
  let peak = 0;
  let reads = 0;
  const { getDashboardData } = await loadData(async (_resource, options) => {
    assert.equal(options.fallbackOnError, false);
    reads++;
    active++;
    peak = Math.max(peak, active);
    await nextTurn();
    active--;
    return [];
  });

  const dashboards = await Promise.all(Array.from({ length: 10 }, (_, index) =>
    getDashboardData({ role: index % 2 ? "HR" : "Enterprise Admin" })
  ));
  assert.equal(reads, 15);
  assert.ok(peak <= 3);
  assert.ok(dashboards[0].visibleWidgetIds.includes("systemHealth"));
  assert.ok(!dashboards[1].visibleWidgetIds.includes("systemHealth"));
  assert.equal(dashboards[0].systemHealth.metrics.find((item) => item.label === "Database Status").value, "Connected");
  for (const label of ["Users Online", "Today's Logins", "Last Backup"]) {
    assert.match(dashboards[0].systemHealth.metrics.find((item) => item.label === label).value, /^Not /);
  }

  await getDashboardData();
  assert.equal(reads, 30, "a later refresh must read fresh data");
});

test("failed dashboard batches drain before retrying and never substitute demo records", async () => {
  const pending = [];
  let localReads = 0;
  let fail = true;
  const failure = Object.assign(new Error("Database unavailable"), { status: 503 });
  const { getDashboardData } = await loadData(() => {
    if (!fail) return [];
    const read = deferred();
    pending.push(read);
    return read.promise;
  }, () => { localReads++; return []; });

  const first = getDashboardData();
  const second = getDashboardData();
  const results = Promise.allSettled([first, second]);
  pending[0].reject(failure);
  await nextTurn();
  assert.equal(pending.length, 3);
  const thirdResult = Promise.allSettled([getDashboardData()]);
  assert.equal(pending.length, 3, "an unfinished batch must still be shared");
  pending[1].resolve([]);
  pending[2].resolve([]);
  for (const result of [...await results, ...await thirdResult]) {
    assert.equal(result.status, "rejected");
    assert.equal(result.reason, failure);
  }
  assert.equal(localReads, 0);
  fail = false;
  assert.ok((await getDashboardData()).generatedAt);
});

test("local dashboard data remains available when persistence is not configured", async () => {
  let localReads = 0;
  const { getDashboardData } = await loadData(() => null, () => { localReads++; return []; });
  const dashboard = await getDashboardData();
  assert.ok(dashboard.generatedAt);
  assert.equal(dashboard.systemHealth.metrics.find((item) => item.label === "Database Status").value, "Local store");
  assert.equal(localReads, 15);
});

test("command summary exports its own figures instead of the KPI list", async () => {
  const { dashboardWidgetRows } = await loadData(() => []);
  const rows = dashboardWidgetRows({
    hero: [{ label: "Attendance", value: "80%" }],
    kpis: [{ label: "Employees", value: 10 }]
  }, "hero");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "Attendance");
  assert.equal(rows[0].value, "80%");
});

async function loadExport(rows) {
  // Run document libraries in the host realm; they use instanceof checks on arrays.
  const dataModule = "data:text/javascript," + encodeURIComponent(`
    export async function getDashboardData() {
      return { visibleWidgets: [{ id: "hero", title: "Command Summary" }] };
    }
    export function dashboardWidgetRows() { return ${JSON.stringify(rows)}; }
  `);
  const source = (await readFile(new URL("../app/api/dashboard/export/route.js", import.meta.url), "utf8"))
    .replace('"@/lib/dashboard-data"', JSON.stringify(dataModule))
    .replace('"exceljs"', JSON.stringify(import.meta.resolve("exceljs")))
    .replace('"pdf-lib"', JSON.stringify(import.meta.resolve("pdf-lib")));
  return import("data:text/javascript," + encodeURIComponent(source));
}

test("Excel download is a readable workbook with numbers and literal text preserved", async () => {
  const { GET } = await loadExport([{ label: "Attendance", value: 80 }, { label: "=1+1", value: "Text, with a comma" }]);
  const response = await GET(new Request("http://localhost/api/dashboard/export?widget=hero&format=excel"));
  assert.match(response.headers.get("content-disposition"), /\.xlsx"$/);
  assert.match(response.headers.get("content-type"), /spreadsheetml.sheet/);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell("A2").value, "Attendance");
  assert.equal(sheet.getCell("B2").value, 80);
  assert.equal(sheet.getCell("A3").value, "=1+1");
  assert.equal(sheet.getCell("B3").value, "Text, with a comma");
});

test("CSV exports quote multiline values and keep formulas as text", async () => {
  const { GET } = await loadExport([{ label: "line\rbreak", value: "=1+1" }, { label: "negative", value: -10 }]);
  const response = await GET(new Request("http://localhost/api/dashboard/export?format=csv"));
  const text = await response.text();
  assert.match(text, /"line\rbreak",'=1\+1/);
  assert.match(text, /negative,-10/);
});

test("PDF exports handle rupees and paginate long records without the old row limit", async () => {
  const rows = Array.from({ length: 100 }, (_, index) => ({
    label: `Record ${index}`,
    value: "\u20b9 1000 " + "Detailed report entry. ".repeat(40)
  }));
  const { GET } = await loadExport(rows);
  const response = await GET(new Request("http://localhost/api/dashboard/export?format=pdf"));
  const pdf = await PDFDocument.load(await response.arrayBuffer());
  assert.ok(pdf.getPageCount() > 5);
});

for (const disconnect of ["abort", "cancel"]) {
  test(`stream ${disconnect} during the initial read leaves no background refresh`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
    let reads = 0;
    const pending = deferred();
    const { GET } = await loadRoute(streamFile, () => { reads++; return pending.promise; });
    const controller = new AbortController();
    const response = await GET(new Request("http://localhost/api/dashboard/stream", { signal: controller.signal }));
    const reader = response.body.getReader();
    if (disconnect === "abort") controller.abort();
    else await reader.cancel();
    assert.equal((await reader.read()).done, true);
    pending.resolve(streamPayload);
    await nextTurn();
    t.mock.timers.tick(120000);
    await nextTurn();
    assert.equal(reads, 1);
  });
}

test("an already disconnected stream performs no database read", async () => {
  let reads = 0;
  const { GET } = await loadRoute(streamFile, async () => { reads++; return streamPayload; });
  const controller = new AbortController();
  controller.abort();
  const response = await GET(new Request("http://localhost/api/dashboard/stream", { signal: controller.signal }));
  assert.equal((await response.body.getReader().read()).done, true);
  assert.equal(reads, 0);
});

test("slow stream refreshes never overlap and cancellation stops future reads", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const pending = [];
  const { GET } = await loadRoute(streamFile, () => {
    const read = deferred();
    pending.push(read);
    return read.promise;
  });
  const response = await GET(new Request("http://localhost/api/dashboard/stream"));
  const reader = response.body.getReader();
  pending[0].resolve(streamPayload);
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /event: dashboard/);
  t.mock.timers.tick(30000);
  assert.equal(pending.length, 2);
  t.mock.timers.tick(90000);
  assert.equal(pending.length, 2);
  await reader.cancel();
  pending[1].resolve(streamPayload);
  await nextTurn();
  t.mock.timers.tick(90000);
  assert.equal(pending.length, 2);
});

test("stream read failures emit an error and remain cancellable", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  let reads = 0;
  const { GET } = await loadRoute(streamFile, async () => { reads++; throw new Error("Database unavailable"); });
  const response = await GET(new Request("http://localhost/api/dashboard/stream"));
  const reader = response.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: error/);
  await reader.cancel();
  t.mock.timers.tick(90000);
  assert.equal(reads, 1);
});

test("dashboard API reports a database outage as JSON with status 503", async () => {
  const { GET } = await loadRoute("../app/api/dashboard/route.js", async () => {
    throw Object.assign(new Error("Database unavailable"), { status: 503 });
  });
  const response = await GET(new Request("http://localhost/api/dashboard"));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Database unavailable" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("pool timeouts activate the existing database cooldown instead of retrying every request", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1000 });
  let reads = 0;
  let warnings = 0;
  const { listPersistentResource, canUsePersistentDatabase } = await loadModule("../lib/prisma-store.js", {
    "./punch-status.js": { attendancePunches: (rows) => rows },
    "@prisma/client": {
      Prisma: {},
      PrismaClient: class {
        employee = { findMany: async () => {
          reads++;
          if (reads === 1) throw Object.assign(new Error("Pool timeout"), { code: "P2024" });
          return [];
        } };
      }
    },
    "bcryptjs": { default: {} },
    "@/backend/lib/ats-sharepoint-sync": {
      isAtsSharePointResource: () => false,
      maybeImportAtsFromSharePoint: () => {},
      queueAtsSharePointExport: () => {}
    }
  }, {
    Date,
    process: { env: { DATABASE_URL: "postgresql://test:test@localhost/test", NODE_ENV: "test" } },
    console: { ...console, warn: () => { warnings++; } }
  });

  await assert.rejects(listPersistentResource("employees", { fallbackOnError: false }), { status: 503 });
  assert.equal(canUsePersistentDatabase(), false);
  await assert.rejects(listPersistentResource("employees", { fallbackOnError: false }), { status: 503 });
  assert.equal(reads, 1);
  assert.equal(warnings, 1);
  t.mock.timers.tick(60000);
  assert.equal(canUsePersistentDatabase(), true);
  assert.equal((await listPersistentResource("employees", { fallbackOnError: false })).length, 0);
  assert.equal(reads, 2);
});
