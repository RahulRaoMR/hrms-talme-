import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import test from "node:test";
import bcrypt from "bcryptjs";
import { createEmployeeLoginAccount } from "../lib/employee-account.js";

const employee = { name: "Employee Record", email: "existing@example.test", employeeId: "TTPL-TEST" };

function fixture(accounts = []) {
  const users = new Map(accounts.map((user) => [user.email, structuredClone(user)]));
  const writes = [];
  const selected = (user, select) => user ? Object.fromEntries(Object.keys(select).map((key) => [key, user[key]])) : null;
  const db = { user: {
    async findUnique({ where, select }) { return selected(users.get(where.email), select); },
    async create({ data, select }) {
      if (users.has(data.email)) throw Object.assign(new Error("Unique email"), { code: "P2002" });
      const user = { id: `test-user-${users.size + 1}`, ...structuredClone(data) };
      users.set(data.email, user);
      writes.push(data);
      return selected(user, select);
    }
  } };
  return { db, users, writes };
}

async function load(file, dependencies) {
  const context = createContext({ console, process: { env: {} } });
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

test("onboarding never changes an existing user's role, password, name, or disabled status", async () => {
  for (const role of ["Enterprise Admin", "Super Admin", "Admin", "Accounts", "ATS", "HR", "Payroll + ATS", "Employee", "Employee HRMS"]) {
    for (const active of [true, false]) {
      const original = { id: "original-user", name: "Original Name", email: employee.email, role, active, passwordHash: "original-hash" };
      const f = fixture([original]);
      const result = await createEmployeeLoginAccount(f.db, employee, "DoNotReplace1");
      assert.equal(result.created, false);
      assert.match(result.reason, /unchanged/);
      assert.deepEqual(f.users.get(employee.email), original);
      assert.equal("passwordHash" in result.user, false);
      assert.equal(f.writes.length, 0);
    }
  }
});

test("new hires still receive a new Employee account with a hashed temporary password", async () => {
  const f = fixture();
  const result = await createEmployeeLoginAccount(f.db, { ...employee, email: "  NEW@example.test " }, "TemporaryPassword1");
  assert.equal(result.created, true);
  assert.equal(result.user.email, "new@example.test");
  assert.equal(result.user.role, "Employee");
  assert.equal(result.user.active, true);
  assert.equal("passwordHash" in result.user, false);
  assert.equal(await bcrypt.compare("TemporaryPassword1", f.users.get(result.user.email).passwordHash), true);
});

test("simultaneous onboarding creates one account and never overwrites the winning password", async () => {
  const f = fixture();
  const passwords = ["FirstTemporary1", "SecondTemporary2"];
  const results = await Promise.all(passwords.map((password) => createEmployeeLoginAccount(f.db, employee, password)));
  assert.equal(results.filter((result) => result.created).length, 1);
  assert.equal(f.writes.length, 1);
  const winner = results.findIndex((result) => result.created);
  assert.equal(await bcrypt.compare(passwords[winner], f.users.get(employee.email).passwordHash), true);
  assert.equal(await bcrypt.compare(passwords[1 - winner], f.users.get(employee.email).passwordHash), false);
});

test("database errors are propagated without inventing a replacement login account", async () => {
  const db = { user: { async findUnique() { throw Object.assign(new Error("Unavailable"), { code: "P1001" }); } } };
  await assert.rejects(createEmployeeLoginAccount(db, employee, "TemporaryPassword1"), { code: "P1001" });
  assert.equal((await createEmployeeLoginAccount(db, {}, "TemporaryPassword1")).created, false);
});

test("Next onboarding skips misleading welcome emails for existing users and never falls back on a database outage", async () => {
  const original = { id: "admin-user", name: "Admin", email: employee.email, role: "Enterprise Admin", active: true, passwordHash: "admin-hash" };
  const f = fixture([original]);
  const emails = [], localWrites = [], marked = [];
  let persistent = true, localAllowed = false;
  const { onboardEmployee } = await load("../lib/employee-onboarding.js", {
    "./employee-account.js": { createEmployeeLoginAccount },
    "@/lib/email-service": { isEmailConfigured: () => true, sendEmail: async (...args) => emails.push(args) },
    "@/lib/password-reset-store": { setLocalEmployeePassword: (...args) => { localWrites.push(args); return true; } },
    "@/lib/prisma-store": {
      prisma: f.db,
      canUsePersistentDatabase: () => persistent,
      canUseLocalMutationFallback: () => localAllowed,
      isDatabaseUnavailableError: (error) => error.code === "P1001",
      markPersistentDatabaseUnavailable: (error) => marked.push(error)
    }
  });
  assert.equal((await onboardEmployee(employee)).accountCreated, false);
  assert.equal(emails.length, 0);
  assert.deepEqual(f.users.get(employee.email), original);
  f.db.user.findUnique = async () => { throw Object.assign(new Error("Unavailable"), { code: "P1001" }); };
  assert.equal((await onboardEmployee(employee)).accountCreated, false);
  assert.equal(marked.length, 1);
  persistent = false;
  assert.equal((await onboardEmployee(employee)).accountCreated, false);
  assert.equal(localWrites.length, 0);
  assert.equal(emails.length, 0);
  localAllowed = true;
  assert.equal((await onboardEmployee(employee)).accountCreated, true);
  assert.equal(localWrites[0][2].createOnly, true);
  assert.equal(emails.length, 1);
});

test("modular backend reuses existing accounts without sending a new temporary password", async () => {
  const original = { id: "admin-user", name: "Admin", email: employee.email, role: "Enterprise Admin", active: true, passwordHash: "admin-hash" };
  const f = fixture([original]);
  const accountService = await load("../backend/services/employeeAccount.js", {
    "@/lib/prisma": { prisma: f.db },
    "../../lib/employee-account.js": { createEmployeeLoginAccount }
  });
  const existing = await accountService.createEmployeePortalAccount(employee);
  assert.equal(existing.created, false);
  assert.equal(existing.password, null);
  assert.deepEqual(f.users.get(employee.email), original);
  const emails = [];
  const { employeeService } = await load("../backend/modules/employee/service.js", {
    "@/services/employeeAccount": accountService,
    "@/services/emailAutomation": { sendWelcomeEmailToEmployee: async (...args) => emails.push(args) },
    "@/services/crud-service": { createCrudService: () => ({ create: async (payload) => payload }) }
  });
  await employeeService.create(employee);
  assert.equal(emails.length, 0);
  await employeeService.create({ ...employee, email: "new-hire@example.test" });
  assert.equal(emails.length, 1);
  assert.equal(await bcrypt.compare(emails[0][1].password, f.users.get("new-hire@example.test").passwordHash), true);
});
