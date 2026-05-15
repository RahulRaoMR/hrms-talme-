import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";

const RESET_TTL_MS = 10 * 60 * 1000;
const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";
const globalForReset = globalThis;
const passwordStorePath = path.join(process.cwd(), ".talme-password-overrides.json");

function readPasswordStoreFile() {
  try {
    if (!fs.existsSync(passwordStorePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(passwordStorePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePasswordStoreFile(passwords) {
  try {
    fs.writeFileSync(
      passwordStorePath,
      JSON.stringify(
        Array.from(passwords.entries()).map(([email, record]) => [email, record]),
        null,
        2
      )
    );
  } catch (error) {
    console.error("Unable to persist local password overrides.", error);
  }
}

const resetStore = globalForReset.talmeLocalPasswordReset || {
  otps: new Map(),
  passwords: new Map(readPasswordStoreFile())
};

if (process.env.NODE_ENV !== "production") {
  globalForReset.talmeLocalPasswordReset = resetStore;
}

const localAccounts = [
  {
    id: "local-admin",
    name: "Talme Director",
    email: "director@talme.ai",
    role: "Enterprise Admin",
    passwordEnv: "DEFAULT_ADMIN_PASSWORD",
    fallbackPassword: "talme123"
  },
  {
    id: "local-hr",
    name: "Talme HR",
    email: "hr@talme.ai",
    role: "HR",
    passwordEnv: "DEFAULT_HR_PASSWORD",
    fallbackPassword: "hr123"
  }
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return {
    admin: "Enterprise Admin",
    hr: "HR",
    employeeHrms: "Employee HRMS",
    payroll: "Payroll",
    employee: "Employee"
  }[role] || role || "";
}

function createHash(value) {
  return crypto.createHmac("sha256", authSecret).update(String(value)).digest("hex");
}

export function setLocalEmployeePassword(email, password) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) return false;

  resetStore.passwords.set(normalizedEmail, {
    passwordHash: createHash(password),
    updatedAt: new Date().toISOString()
  });
  writePasswordStoreFile(resetStore.passwords);
  return true;
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDefaultPassword(account) {
  return process.env[account.passwordEnv] || account.fallbackPassword;
}

function getLocalAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return localAccounts.find((account) => account.email === normalizedEmail) || null;
}

function passwordMatches(record, password) {
  if (!record) return false;

  if (typeof record === "string") {
    return record === password || record === createHash(password);
  }

  return record.passwordHash === createHash(password);
}

async function getEmployeeByIdentifier(identifier) {
  const lookup = String(identifier || "").trim();
  const persistentEmployees = await listPersistentResource("employees");
  const employees = persistentEmployees || getResource("employees") || [];
  const payslipEmployees = (getResource("payslips") || []).map((record) => ({
    id: record.id,
    employeeId: record.employeeId,
    email: record.email,
    name: record.name || record.employee,
    department: record.department,
    grade: record.designation,
    joiningDate: record.joiningDate,
    salaryBand: record.monthlyCtc ? `Monthly - INR ${record.monthlyCtc}` : "",
    salaryNetPay: Number(record.monthlyNetPay) || 0,
    bankStatus: record.bankName || "",
    status: "Active"
  }));
  const employeeRows = [...employees, ...payslipEmployees];

  return (
    employeeRows.find((entry) => String(entry.employeeId || "").toLowerCase() === lookup.toLowerCase()) ||
    employeeRows.find((entry) => normalizeEmail(entry.email) === normalizeEmail(lookup)) ||
    null
  );
}

async function getEmployeeEmail(identifier) {
  const employee = await getEmployeeByIdentifier(identifier);
  return normalizeEmail(employee?.email);
}

export async function getLocalLoginAccount(identifier, password, expectedRole) {
  const normalizedEmail = normalizeEmail(identifier);
  const resolvedRole = normalizeRole(expectedRole);
  const account = getLocalAccountByEmail(normalizedEmail);

  if (resolvedRole === "Employee") {
    const employee = await getEmployeeByIdentifier(identifier);
    const employeeEmail = normalizeEmail(employee?.email);
    const savedPassword = resetStore.passwords.get(employeeEmail);

    if (!employee || !employeeEmail || !passwordMatches(savedPassword, password)) {
      return null;
    }

    return {
      id: employee.id || employee.employeeId,
      name: employee.name || employee.employeeId,
      email: employeeEmail,
      role: "Employee",
      employeeId: employee.employeeId || null
    };
  }

  if (!account || (resolvedRole && account.role !== resolvedRole)) {
    return null;
  }

  const savedPassword = resetStore.passwords.get(account.email);
  const passwordOk = savedPassword
    ? passwordMatches(savedPassword, password)
    : password === getDefaultPassword(account);

  if (!passwordOk) return null;

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    employeeId: null
  };
}

export async function hasLocalPasswordOverride(identifier) {
  const account = getLocalAccountByEmail(identifier);

  if (account && resetStore.passwords.has(account.email)) {
    return true;
  }

  const employee = await getEmployeeByIdentifier(identifier);
  const employeeEmail = normalizeEmail(employee?.email);
  return Boolean(employeeEmail && resetStore.passwords.has(employeeEmail));
}

async function sendOtpEmail(email, otp) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`Password reset OTP for ${email}: ${otp}`);
      return { delivered: false, devOtp: otp };
    }

    throw createError("Email service is not configured. Add RESEND_API_KEY in .env, then restart the server.", 503);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Talme HRMS <onboarding@resend.dev>",
      to: email,
      subject: "Talme HRMS password reset OTP",
      html: `<p>Your Talme HRMS password reset OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
      text: `Your Talme HRMS password reset OTP is ${otp}. It expires in 10 minutes.`
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createError(payload?.message || payload?.error || "Unable to send OTP. Check email settings in .env.", 503);
  }

  return { delivered: true };
}

export async function requestLocalPasswordReset(payload) {
  const role = normalizeRole(payload?.role);
  const identifier = String(payload?.identifier || payload?.email || "").trim();
  let email = normalizeEmail(identifier);

  if (!identifier) {
    throw createError(role === "Employee" ? "Enter Employee ID first." : "Enter your email first.");
  }

  if (role === "Employee" || !identifier.includes("@")) {
    email = await getEmployeeEmail(identifier);

    if (!email) {
      throw createError("No registered email was found for that Employee ID.", 404);
    }
  } else if (!getLocalAccountByEmail(email)) {
    throw createError("No local account was found for that email.", 404);
  }

  const otp = createOtp();
  resetStore.otps.set(email, {
    otpHash: createHash(otp),
    expiresAt: Date.now() + RESET_TTL_MS,
    attempts: 0
  });

  const delivery = await sendOtpEmail(email, otp);

  return {
    email,
    devOtp: delivery.devOtp,
    message: delivery.devOtp
      ? `Development OTP: ${delivery.devOtp}`
      : "OTP sent to your registered email account."
  };
}

export function confirmLocalPasswordReset(payload) {
  const email = normalizeEmail(payload?.email);
  const otp = String(payload?.otp || "").trim();
  const password = String(payload?.password || "");
  const record = resetStore.otps.get(email);

  if (!email || !otp || !password) {
    throw createError("Email, OTP, and new password are required.");
  }

  if (password.length < 6) {
    throw createError("Password must be at least 6 characters.");
  }

  if (!record || record.expiresAt < Date.now()) {
    resetStore.otps.delete(email);
    throw createError("OTP has expired. Please request a new one.", 410);
  }

  if (record.attempts >= 5) {
    resetStore.otps.delete(email);
    throw createError("Too many OTP attempts. Please request a new one.", 429);
  }

  if (record.otpHash !== createHash(otp)) {
    record.attempts += 1;
    resetStore.otps.set(email, record);
    throw createError("Invalid OTP. Please check your email and try again.", 401);
  }

  resetStore.passwords.set(email, {
    passwordHash: createHash(password),
    updatedAt: new Date().toISOString()
  });
  writePasswordStoreFile(resetStore.passwords);
  resetStore.otps.delete(email);

  return {
    message: "Password changed successfully. You can sign in with the new password."
  };
}
