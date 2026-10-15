import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import * as roles from "../lib/login-roles.js";

async function load(file, dependencies, globals = {}) {
  const context = createContext({ console, Buffer, Request, Response, ...globals });
  const module = new SourceTextModule(await readFile(new URL(file, import.meta.url), "utf8"), { context });
  await module.link(async (specifier) => {
    const exports = dependencies[specifier] || await import(specifier);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

async function fixture({ role = "Employee HRMS", persistent = true } = {}) {
  const employee = { id: "emp-1", employeeId: "TTPL-1", name: "Test Employee", email: "employee@talme.test" };
  const account = { id: "user-1", email: employee.email, name: employee.name, role, active: true, passwordHash: await bcrypt.hash("OldPassword1", 4) };
  const state = { now: Date.now(), emails: [], writes: [], updates: [], localReads: 0, failedDelivery: false, failedWrite: false, unavailable: false, random: 0 };
  const prisma = {
    employee: { findFirst: async ({ where }) => where.employeeId.equals.toLowerCase() === "ttpl-1" ? employee : null },
    user: {
      findUnique: async ({ where }) => state.unavailable ? Promise.reject({ code: "P1001" }) : where.email === account.email ? { ...account } : null,
      update: async ({ where, data }) => {
        if (state.failedWrite) throw { code: "P1001" };
        assert.equal(where.id, account.id);
        assert.equal(where.active, true);
        assert.deepEqual(Object.keys(data), ["passwordHash"]);
        assert.equal(account.active, true);
        state.updates.push(data);
        Object.assign(account, data);
        return { ...account };
      }
    }
  };
  const persistentStore = {
    prisma,
    canUsePersistentDatabase: () => persistent,
    canUseLocalMutationFallback: () => !persistent,
    isDatabaseUnavailableError: (error) => error?.code === "P1001",
    markPersistentDatabaseUnavailable: () => {},
    listPersistentResource: async () => [employee],
    createPersistentAuditLog: async () => ({ id: "test-audit" })
  };
  const reset = await load("../lib/password-reset-store.js", {
    "node:crypto": { default: { ...crypto, randomInt: () => 100000 + (++state.random) } },
    "node:fs": { default: { existsSync: () => false, writeFileSync: (_path, data) => state.writes.push(data) } },
    "@/lib/email-service": { isEmailConfigured: () => true, sendEmail: async (_to, _subject, _html, options) => {
      const otp = options.text.match(/\b\d{6}\b/)[0];
      state.emails.push(otp);
      if (state.failedDelivery) throw new Error("Email provider unavailable");
    } },
    "@/lib/local-api-store": { getResource: (resource) => resource === "employees" ? [employee] : [] },
    "@/lib/prisma-store": persistentStore,
    "@/lib/login-roles": roles
  }, {
    process: { env: { NODE_ENV: "production", AUTH_SECRET: "test-only-key" }, cwd: () => process.cwd() },
    Date: class extends Date { static now() { return state.now; } }
  });
  const login = await load("../app/api/auth/login/route.js", {
    "@/lib/local-api-store": { createActivityLog: () => {} },
    "@/lib/password-reset-store": {
      getLocalLoginAccount: (...args) => { state.localReads++; return reset.getLocalLoginAccount(...args); },
      hasLocalPasswordOverride: reset.hasLocalPasswordOverride
    },
    "@/lib/server-api": { proxyToConfiguredApi: async () => null },
    "@/lib/prisma-store": persistentStore,
    "@/lib/login-roles": roles
  }, { process: { env: { NODE_ENV: "production", AUTH_SECRET: "test-only-key" } } });
  return {
    employee, account, state, reset,
    request: () => reset.requestLocalPasswordReset({ identifier: "TTPL-1", role: "employee" }),
    confirm: (extra = {}) => reset.confirmLocalPasswordReset({ email: employee.email, otp: state.emails.at(-1), password: "NewPassword2", ...extra }),
    login: (password, role = "employee") => login.POST(new Request("http://test/api/auth/login", { method: "POST", body: JSON.stringify({ email: "TTPL-1", password, role }) }))
  };
}

test("both employee login role names match without granting a corporate role", () => {
  assert.equal(roles.loginRolesMatch("Employee HRMS", "employee"), true);
  assert.equal(roles.loginRolesMatch("Employee", "employeeHrms"), true);
  assert.equal(roles.loginRolesMatch("Employee HRMS", "admin"), false);
  assert.equal(roles.loginRolesMatch("Enterprise Admin", "employee"), false);
  assert.equal(roles.loginRolesMatch("ATS", "employee"), false);
  assert.equal(roles.canonicalLoginRole("Employee HRMS"), "Employee HRMS");
});

for (const role of ["Employee", "Employee HRMS"]) {
  test(`${role} can reset and sign in through either entry point without changing assigned permissions`, async () => {
    const f = await fixture({ role });
    await f.request();
    await f.confirm({ role: "admin" });
    assert.equal(f.account.role, role);
    assert.equal(f.account.name, "Test Employee");
    assert.equal(f.account.active, true);
    for (const entry of ["employee", "employeeHrms"]) {
      const response = await f.login("NewPassword2", entry);
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.user.role, role);
      assert.equal(payload.user.employeeId, "TTPL-1");
      assert.equal(JSON.parse(Buffer.from(payload.token.split(".")[0], "base64url")).user.role, role);
    }
    assert.equal((await f.login("OldPassword1")).status, 401);
    assert.equal(f.state.localReads, 0, "a database password rejection must not use an old local password");
    await assert.rejects(f.confirm(), { status: 410 });
  });
}

test("wrong, expired, exhausted, and superseded OTPs cannot change a password", async () => {
  const f = await fixture();
  await f.request();
  const original = f.state.emails.at(-1);
  await assert.rejects(f.confirm({ otp: "000000" }), { status: 401 });
  await f.request();
  await assert.rejects(f.confirm({ otp: original }), { status: 401 });
  f.state.now += 11 * 60 * 1000;
  await assert.rejects(f.confirm(), { status: 410 });
  await f.request();
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(f.confirm({ otp: "000000" }), { status: 401 });
  await assert.rejects(f.confirm(), { status: 429 });
  assert.equal(f.state.updates.length, 0);
});

test("disabled, missing, and wrong-role accounts do not receive OTPs", async () => {
  const f = await fixture();
  f.account.active = false;
  await assert.rejects(f.request(), { status: 404 });
  f.account.active = true;
  f.account.role = "ATS";
  await assert.rejects(f.request(), { status: 404 });
  await assert.rejects(f.reset.requestLocalPasswordReset({ email: "unknown@talme.test", role: "admin" }), { status: 404 });
  await assert.rejects(f.reset.requestLocalPasswordReset({ identifier: "employee@talme.test", role: "employee" }), { status: 400 });
  assert.equal(f.state.emails.length, 0);
});

test("an account disabled after OTP delivery cannot be reactivated by resetting its password", async () => {
  const f = await fixture();
  await f.request();
  f.account.active = false;
  await assert.rejects(f.confirm(), { status: 404 });
  assert.equal(f.account.active, false);
  assert.equal(f.state.updates.length, 0);
});

test("delivery failures invalidate the undelivered OTP", async () => {
  const f = await fixture();
  f.state.failedDelivery = true;
  await assert.rejects(f.request(), /Email provider unavailable/);
  await assert.rejects(f.confirm(), { status: 410 });
});

test("database write failures never report a successful local-only password change", async () => {
  const f = await fixture();
  await f.request();
  f.state.failedWrite = true;
  await assert.rejects(f.confirm(), { status: 503 });
  assert.equal(f.state.writes.length, 0);
  assert.equal(await bcrypt.compare("OldPassword1", f.account.passwordHash), true);
  f.state.failedWrite = false;
  await f.confirm();
  assert.equal(await bcrypt.compare("NewPassword2", f.account.passwordHash), true);
});

test("the same OTP cannot be confirmed by two simultaneous requests", async () => {
  const f = await fixture();
  await f.request();
  const results = await Promise.allSettled([f.confirm(), f.confirm()]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
  assert.equal(f.state.updates.length, 1);
});

test("reset rejects passwords that cannot be used by the existing login validation", async () => {
  const f = await fixture();
  await f.request();
  await assert.rejects(f.confirm({ password: "short" }), { status: 400 });
  await assert.rejects(f.confirm({ password: " NewPassword2 " }), { status: 400 });
  assert.equal(f.state.updates.length, 0);
  await f.confirm();
});

test("local employee accounts retain their role and only accept the new password after reset", async () => {
  const f = await fixture({ persistent: false });
  f.reset.setLocalEmployeePassword(f.employee.email, "OldPassword1", { role: "Employee HRMS", name: f.employee.name });
  await f.request();
  await f.confirm({ role: "admin" });
  assert.equal((await f.login("OldPassword1")).status, 401);
  const response = await f.login("NewPassword2");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, "Employee HRMS");
});

test("the shared employee sign-in supports legacy deployed roles without retrying corporate roles", async () => {
  const calls = [];
  const { signInEmployee } = await load("../lib/employee-login.js", {
    "@/lib/api-client": { apiUrl: (path) => `https://api.talme.test${path}` }
  }, { fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, role: body.role });
    return new Response("{}", { status: body.role === "employee" ? 401 : 200 });
  } });
  assert.equal((await signInEmployee("TTPL-1", "password")).status, 200);
  assert.deepEqual(calls.map((call) => call.role), ["employee", "employeeHrms"]);
  assert.equal(calls.every((call) => call.url.startsWith("https://api.talme.test/")), true);
});

test("employee sign-in only falls back to the local API for an unavailable remote service", async () => {
  const calls = [];
  let status = 503;
  const { signInEmployee } = await load("../lib/employee-login.js", {
    "@/lib/api-client": { apiUrl: (path) => `https://api.talme.test${path}` }
  }, { fetch: async (url) => {
    calls.push(url);
    return new Response("{}", { status: url.startsWith("/") ? 200 : status });
  } });
  assert.equal((await signInEmployee("TTPL-1", "password")).status, 200);
  assert.deepEqual(calls, ["https://api.talme.test/api/auth/login", "/api/auth/login"]);
  calls.length = 0;
  status = 403;
  assert.equal((await signInEmployee("TTPL-1", "password")).status, 403);
  assert.equal(calls.length, 1);
});
