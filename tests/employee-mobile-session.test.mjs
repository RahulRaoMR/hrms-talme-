import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createEmployeeMobileSession, refreshEmployeeMobileSession, revokeEmployeeMobileSession, employeeMobileUser, employeeAccessLifetimeMs, employeeRefreshLifetimeMs } from "../backend/lib/employee-mobile-session.js";

process.env.AUTH_SECRET = "isolated-employee-mobile-test-secret";

function fixture() {
  const account = { id: "account-1", email: "employee@example.test", passwordHash: "existing-bcrypt-hash", active: true, role: "Employee HRMS" };
  const employee = { id: "employee-row-1", employeeId: "TTPL-MOBILE-TEST", name: "Session Test", email: account.email, status: "Active" };
  const sessions = new Map();
  const state = { unavailable: false };
  const db = {
    user: { findUnique: async ({ where }) => { if (state.unavailable) throw Object.assign(new Error("Unavailable"), { code: "P1001" }); return where.id === account.id ? { ...account } : null; } },
    employee: { findFirst: async ({ where }) => where.employeeId.equals.toLowerCase() === employee.employeeId.toLowerCase() ? { ...employee } : null },
    employeeMobileSession: {
      create: async ({ data }) => { const row = { revokedAt: null, previousTokenHash: null, rotation: 0, ...data }; sessions.set(row.id, row); return { ...row }; },
      findUnique: async ({ where }) => sessions.has(where.id) ? { ...sessions.get(where.id) } : null,
      updateMany: async ({ where, data }) => {
        const row = sessions.get(where.id);
        if (!row || Object.entries(where).some(([key, value]) => row[key] !== value)) return { count: 0 };
        Object.assign(row, data); return { count: 1 };
      }
    }
  };
  const user = { id: account.id, email: account.email, name: employee.name, employeeId: employee.employeeId, role: account.role };
  const sign = (user) => {
    const payload = Buffer.from(JSON.stringify({ user, expiresAt: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
    return `Bearer ${payload}.${crypto.createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url")}`;
  };
  return { db, account, employee, sessions, state, create: () => createEmployeeMobileSession(db, sign(user)), sign };
}

test("mobile sessions reuse employee identity, hash refresh credentials, and issue 30-minute access", async () => {
  const f = fixture(); const response = await f.create();
  const stored = [...f.sessions.values()][0];
  assert.equal(response.user.role, "Employee HRMS");
  assert.ok(Math.abs(response.expiresAt - Date.now() - employeeAccessLifetimeMs) < 1000);
  assert.ok(Math.abs(new Date(stored.expiresAt).getTime() - Date.now() - employeeRefreshLifetimeMs) < 1000);
  assert.equal(stored.refreshTokenHash, crypto.createHash("sha256").update(response.refreshToken).digest("hex"));
  assert.equal(JSON.stringify(stored).includes(response.refreshToken), false);
  assert.equal(JSON.stringify(stored).includes(f.account.passwordHash), false);
  assert.equal((await employeeMobileUser(f.db, `Bearer ${response.token}`)).user.employeeId, f.employee.employeeId);
  await assert.rejects(createEmployeeMobileSession(f.db, f.sign({ id: f.account.id, email: f.account.email, role: "HR" })), { status: 403 });
});

test("employee can return days later and rotate the persistent credential without a password", async () => {
  const f = fixture(); const first = await f.create();
  const later = Date.now() + 14 * 86400000;
  const second = await refreshEmployeeMobileSession(f.db, first.refreshToken, later);
  assert.notEqual(first.refreshToken, second.refreshToken);
  assert.equal(second.user.employeeId, first.user.employeeId);
  assert.equal(second.expiresAt, later + employeeAccessLifetimeMs);
  assert.equal(second.refreshExpiresAt, later + employeeRefreshLifetimeMs);
});

test("concurrent refresh calls and a lost-response retry return the same new credential", async () => {
  const f = fixture(); const first = await f.create();
  const results = await Promise.all(Array.from({ length: 8 }, () => refreshEmployeeMobileSession(f.db, first.refreshToken)));
  assert.equal(new Set(results.map((result) => result.refreshToken)).size, 1);
  assert.equal([...f.sessions.values()][0].rotation, 1);
  assert.equal((await refreshEmployeeMobileSession(f.db, first.refreshToken)).refreshToken, results[0].refreshToken);
});

test("logout revokes this device's refresh and still-valid access tokens, preserving other devices", async () => {
  const f = fixture(); const first = await f.create(); const other = await f.create();
  await revokeEmployeeMobileSession(f.db, first.refreshToken);
  await assert.rejects(employeeMobileUser(f.db, `Bearer ${first.token}`), { status: 401 });
  await assert.rejects(refreshEmployeeMobileSession(f.db, first.refreshToken), { status: 401 });
  assert.equal((await employeeMobileUser(f.db, `Bearer ${other.token}`)).user.id, f.account.id);
});

for (const change of ["inactive-user", "disabled-employee", "removed-employee", "password-changed", "corporate-role"]) {
  test(`${change} invalidates existing mobile access and refresh`, async () => {
    const f = fixture(); const first = await f.create();
    if (change === "inactive-user") f.account.active = false;
    if (change === "disabled-employee") f.employee.status = "Inactive";
    if (change === "removed-employee") f.employee.employeeId = "Removed";
    if (change === "password-changed") f.account.passwordHash = "new-bcrypt-hash";
    if (change === "corporate-role") f.account.role = "HR";
    await assert.rejects(employeeMobileUser(f.db, `Bearer ${first.token}`), { status: 401 });
    await assert.rejects(refreshEmployeeMobileSession(f.db, first.refreshToken), { status: 401 });
    assert.ok([...f.sessions.values()][0].revokedAt);
  });
}

test("reusing a rotated token after its retry window revokes its family; malformed tokens cannot revoke sessions", async () => {
  const f = fixture(); const first = await f.create();
  const second = await refreshEmployeeMobileSession(f.db, first.refreshToken);
  await assert.rejects(refreshEmployeeMobileSession(f.db, second.refreshToken + "x"), { status: 401 });
  assert.equal((await employeeMobileUser(f.db, `Bearer ${second.token}`)).user.id, f.account.id);
  await assert.rejects(refreshEmployeeMobileSession(f.db, first.refreshToken, Date.now() + 61000), { status: 401 });
  await assert.rejects(employeeMobileUser(f.db, `Bearer ${second.token}`), { status: 401 });
});

test("database outages fail closed without revoking the saved session", async () => {
  const f = fixture(); const first = await f.create(); f.state.unavailable = true;
  await assert.rejects(refreshEmployeeMobileSession(f.db, first.refreshToken), { code: "P1001" });
  assert.equal([...f.sessions.values()][0].revokedAt, null);
  f.state.unavailable = false;
  assert.ok((await refreshEmployeeMobileSession(f.db, first.refreshToken)).token);
});
