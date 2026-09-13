import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import { isActivePunch } from "../lib/punch-status.js";

const require = createRequire(new URL("../backend/package.json", import.meta.url));
const dotenv = require("dotenv");
const env = dotenv.parse(fs.readFileSync(new URL("../backend/.env", import.meta.url)));
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const base = process.env.TEST_API_URL || "http://localhost:5000";
const employeeId = `TEST-REG-${crypto.randomUUID()}`;
const ids = new Set();
function session(role, id = employeeId) {
  const user = { email: `${role === "HR" ? "reviewer" : "employee"}@example.invalid`, role, employeeId: id };
  const payload = Buffer.from(JSON.stringify({ user, expiresAt: Date.now() + 600000 })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", env.AUTH_SECRET || "talme-dev-secret").update(payload).digest("base64url")}`;
}
const employee = session("Employee");
const hr = session("HR", "TEST-HR-REVIEWER");
async function request(path, token, method = "GET", body, expected = 200) {
  const response = await fetch(base + path, {
    method, headers: { Authorization: token ? `Bearer ${token}` : "", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}
async function submit(date, manual = true) {
  const body = { employeeId, employeeName: "Regularization Test", workDate: date, timestamp: `${date}T03:30:00.000Z`, type: "Punch In", time: "09:00 am", ...(manual ? { manualEntry: true, reason: "Test request" } : {}) };
  const response = await fetch(base + "/api/punch-activity", { method: "POST", headers: { Authorization: `Bearer ${employee}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const row = await response.json();
  assert.ok([200, 201].includes(response.status), JSON.stringify(row));
  ids.add(row.id);
  return { row, body };
}
try {
  await request("/api/punch-activity/regularizations", "", "GET", null, 401);
  const { row, body } = await submit("2026-08-01");
  assert.equal(row.regularizationStatus, "Pending");
  assert.equal(isActivePunch(row), false);
  const retry = await request("/api/punch-activity", employee, "POST", body);
  assert.equal(retry.id, row.id);
  assert.equal(await db.punchActivity.count({ where: { employeeId, workDate: body.workDate } }), 1);
  assert.ok((await request("/api/punch-activity/regularizations", hr)).some(item => item.id === row.id));
  await request(`/api/punch-activity/${row.id}/review`, employee, "PATCH", { status: "Accepted" }, 403);
  await request(`/api/punch-activity/${row.id}/review`, session("HR"), "PATCH", { status: "Accepted" }, 403);
  await request("/api/punch-activity?employeeId=SOMEONE-ELSE", employee, "GET", null, 403);
  await request(`/api/punch-activity/${row.id}`, employee, "PATCH", { regularizationStatus: "Accepted" }, 405);
  const accepted = await request(`/api/punch-activity/${row.id}/review`, hr, "PATCH", { status: "Accepted" });
  assert.equal(accepted.id, row.id);
  assert.equal(accepted.regularizationReviewedBy, "reviewer@example.invalid");
  assert.ok(accepted.regularizationReviewedAt);
  assert.equal(isActivePunch(accepted), true);
  await request(`/api/punch-activity/${row.id}/review`, hr, "PATCH", { status: "Declined" }, 409);
  await request("/api/punch-activity", employee, "POST", body, 409);
  const second = await submit("2026-08-02");
  const declined = await request(`/api/punch-activity/${second.row.id}/review`, hr, "PATCH", { status: "Declined", reason: "Incorrect date" });
  assert.equal(declined.regularizationDeclineReason, "Incorrect date");
  assert.equal(isActivePunch(declined), false);
  const ownRows = await request("/api/punch-activity/regularizations", employee);
  assert.ok(ownRows.every(item => item.employeeId === employeeId));
  assert.equal(ownRows.find(item => item.id === row.id).regularizationStatus, "Accepted");
  assert.equal(ownRows.find(item => item.id === second.row.id).regularizationStatus, "Declined");
  const third = await submit("2026-08-03");
  const race = await Promise.all(["Accepted", "Declined"].map(status => fetch(`${base}/api/punch-activity/${third.row.id}/review`, { method: "PATCH", headers: { Authorization: `Bearer ${hr}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) })));
  assert.deepEqual(race.map(response => response.status).sort(), [200, 409]);
  const fourth = await submit("2026-08-04");
  await request(`/api/punch-activity/${fourth.row.id}/withdraw`, session("Employee", "OTHER"), "PATCH", {}, 403);
  const withdrawn = await request(`/api/punch-activity/${fourth.row.id}/withdraw`, employee, "PATCH", {});
  assert.equal(withdrawn.regularizationStatus, "Withdrawn");
  const normal = await submit("2026-08-05", false);
  assert.equal(isActivePunch(normal.row), true);
  assert.equal(normal.row.regularizationStatus, null);
  const normalRetry = await request("/api/punch-activity", employee, "POST", normal.body);
  assert.equal(normalRetry.id, normal.row.id);
  console.log("PASS: submit, retry without duplicates, HR accept/decline, own-status retrieval, permissions, self-review rejection, concurrent review, withdrawal, normal punch.");
} finally {
  await db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: [...ids, employeeId] } }, { detail: { contains: employeeId } }] } });
  await db.punchActivity.deleteMany({ where: { employeeId } });
  await db.$disconnect();
}
