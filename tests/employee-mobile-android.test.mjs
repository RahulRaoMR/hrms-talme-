import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

test("Android Keystore session survives force-stop and reboot; logout prevents restoration", {
  skip: process.env.EMPLOYEE_MOBILE_ANDROID_TESTS !== "true" && "Requires the separate .sessiontest APK, read-only emulator and local validation services.",
  timeout: 300000
}, async (t) => {
  process.loadEnvFile(path.resolve("backend/.env"));
  const db = new PrismaClient();
  const employeeId = `ANDROID-CHECK-${crypto.randomUUID().slice(0, 8)}`;
  const name = "Android Session Test";
  const email = `${employeeId.toLowerCase()}@example.test`;
  const password = `Test!${crypto.randomBytes(18).toString("hex")}`;
  const account = await db.user.create({ data: { name, email, role: "Employee", active: true, passwordHash: await bcrypt.hash(password, 4) } });
  await db.employee.create({ data: { employeeId, name, email, department: "Validation", location: "Bengaluru", manager: "Test Manager", grade: "Engineer", joiningDate: "2026-10-22", salaryBand: "0", salaryNetPay: 0, bankStatus: "Pending", status: "Active", tone: "green" } });
  t.after(async () => {
    await db.auditLog.deleteMany({ where: { actor: { in: [email, employeeId] } } });
    await db.user.deleteMany({ where: { id: account.id } });
    await db.employee.deleteMany({ where: { employeeId } });
    await db.$disconnect();
  });
  const { _android } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  let device = (await _android.devices()).find((device) => device.serial() === "emulator-5554");
  assert.ok(device, "The explicitly selected emulator must be connected.");
  t.after(() => device?.close().catch(() => {}));
  const pkg = "in.talme.hrms.employee.sessiontest";
  const launch = `am start -n ${pkg}/in.talme.hrms.employee.MainActivity`;
  const output = "artifacts/employee-mobile-session";
  await mkdir(output, { recursive: true });
  const open = async () => {
    await device.shell(launch);
    return (await device.webView({ pkg, timeout: 60000 })).page();
  };
  let page = await open();
  await page.getByLabel("Employee ID", { exact: true }).fill(employeeId);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("heading", { name, exact: true }).waitFor({ timeout: 60000 });
  const refreshToken = await page.evaluate(async () => JSON.parse((await window.Capacitor.Plugins.EmployeeSession.read()).credential).refreshToken);
  const encrypted = (await device.shell(`run-as ${pkg} cat no_backup/employee-session.enc`)).toString();
  assert.ok(encrypted.startsWith("1:"), "The native file is a versioned AES-GCM ciphertext.");
  assert.equal(encrypted.includes(refreshToken), false, "Refresh credentials are not stored in plaintext.");
  assert.equal(await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) => value.includes("refreshToken"))), false);
  await page.screenshot({ path: `${output}/android-first-login.png` });

  await device.shell(`am force-stop ${pkg}`);
  page = await open();
  await page.getByRole("heading", { name, exact: true }).waitFor({ timeout: 60000 });
  assert.equal(await page.getByLabel("Password", { exact: true }).count(), 0);
  await page.screenshot({ path: `${output}/android-after-force-stop.png` });

  if (process.env.EMPLOYEE_MOBILE_ANDROID_REBOOT === "true") {
    await device.close(); device = null;
    const adb = process.env.ADB_EXECUTABLE_PATH || "C:/Users/royal/AppData/Local/Android/Sdk/platform-tools/adb.exe";
    execFileSync(adb, ["-s", "emulator-5554", "reboot"], { stdio: "ignore" });
    const deadline = Date.now() + 150000;
    let booted = false;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (execFileSync(adb, ["-s", "emulator-5554", "shell", "getprop", "sys.boot_completed"], { timeout: 3000, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() === "1") { booted = true; break; }
      } catch {}
    }
    assert.ok(booted, "The read-only emulator completes its reboot.");
    device = (await _android.devices()).find((item) => item.serial() === "emulator-5554");
    await device.shell("input keyevent 82");
    page = await open();
    await page.getByRole("heading", { name, exact: true }).waitFor({ timeout: 60000 });
    await page.screenshot({ path: `${output}/android-after-phone-reboot.png` });
  }

  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.locator("button.logout").click();
  await page.getByRole("button", { name: "Sign In", exact: true }).waitFor({ timeout: 60000 });
  await device.shell(`am force-stop ${pkg}`);
  page = await open();
  await page.getByRole("button", { name: "Sign In", exact: true }).waitFor({ timeout: 60000 });
  assert.equal(await page.evaluate(async () => Boolean((await window.Capacitor.Plugins.EmployeeSession.read()).credential)), false);
  await page.screenshot({ path: `${output}/android-after-logout-reopen.png` });
});
