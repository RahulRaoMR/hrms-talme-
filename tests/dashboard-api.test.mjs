import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.DASHBOARD_TEST_BASE_URL || "http://localhost:3001";

async function fetchOrSkip(t, path) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      signal: AbortSignal.timeout(15000)
    });
    return response;
  } catch (error) {
    t.skip(`Dashboard server is not running at ${baseUrl}: ${error.message}`);
    return null;
  }
}

test("dashboard API returns role-filtered operational widgets", async (t) => {
  const response = await fetchOrSkip(t, "/api/dashboard?range=30d&role=HR");
  if (!response) return;

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.ok(payload.generatedAt);
  assert.equal(payload.range.key, "30d");
  assert.ok(Array.isArray(payload.visibleWidgets));
  assert.ok(payload.visibleWidgets.some((widget) => widget.id === "attendance"));
  assert.ok(payload.visibleWidgets.every((widget) => widget.id !== "systemHealth"));
  assert.ok(Array.isArray(payload.kpis));
  assert.ok(payload.kpis.every((kpi) => kpi.href && kpi.trend));
});

test("dashboard API exposes payroll widgets for payroll role", async (t) => {
  const response = await fetchOrSkip(t, "/api/dashboard?range=7d&role=Payroll");
  if (!response) return;

  assert.equal(response.status, 200);
  const payload = await response.json();
  const ids = payload.visibleWidgets.map((widget) => widget.id);

  assert.ok(ids.includes("payroll"));
  assert.ok(ids.includes("kpis"));
  assert.ok(!ids.includes("recruitment"));
});

test("dashboard export endpoint returns CSV and PDF payloads", async (t) => {
  const csv = await fetchOrSkip(t, "/api/dashboard/export?widget=kpis&format=csv&range=30d&role=CEO");
  if (!csv) return;

  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type") || "", /csv/);
  assert.match(await csv.text(), /label|value/i);

  const pdf = await fetchOrSkip(t, "/api/dashboard/export?widget=kpis&format=pdf&range=30d&role=CEO");
  if (!pdf) return;

  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type") || "", /pdf/);
  assert.ok((await pdf.arrayBuffer()).byteLength > 100);
});
