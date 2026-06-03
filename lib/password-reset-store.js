import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { isEmailConfigured, sendEmail } from "@/lib/email-service";
import { getResource } from "@/lib/local-api-store";
import { hasPersistentDatabase, listPersistentResource, prisma } from "@/lib/prisma-store";

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
  },
  {
    id: "local-saidarshaan",
    name: "Saidarshaan",
    email: "saidarshaan@talme.in",
    role: "Enterprise Admin",
    passwordEnv: "DEFAULT_ACCESS_PASSWORD",
    fallbackPassword: "talme123"
  },
  {
    id: "local-nandhini",
    name: "Nandhini",
    email: "nandhini@talme.in",
    role: "Payroll + ATS",
    passwordEnv: "DEFAULT_ACCESS_PASSWORD",
    fallbackPassword: "talme123"
  },
  {
    id: "local-amrutha",
    name: "Amrutha",
    email: "accounts@talme.in",
    role: "Invoice",
    passwordEnv: "DEFAULT_ACCESS_PASSWORD",
    fallbackPassword: "talme123"
  },
  {
    id: "local-harshitha",
    name: "Harshitha",
    email: "harshitha@talme.in",
    role: "ATS",
    passwordEnv: "DEFAULT_ACCESS_PASSWORD",
    fallbackPassword: "talme123"
  },
  {
    id: "local-himanshu",
    name: "Himanshu",
    email: "himanshu@talme.in",
    role: "ATS",
    passwordEnv: "DEFAULT_ACCESS_PASSWORD",
    fallbackPassword: "talme123"
  },
  {
    id: "local-pooja",
    name: "Pooja",
    email: "hr@talme.in",
    role: "ATS",
    passwordEnv: "DEFAULT_ACCESS_PASSWORD",
    fallbackPassword: "talme123"
  },
  {
    id: "local-sreehari",
    name: "Sreehari",
    email: "sreehari@talme.in",
    role: "ATS",
    passwordEnv: "DEFAULT_ACCESS_PASSWORD",
    fallbackPassword: "talme123"
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

function usesEmployeeIdIdentifier(role) {
  return ["Employee", "Employee HRMS"].includes(normalizeRole(role));
}

function createHash(value) {
  return crypto.createHmac("sha256", authSecret).update(String(value)).digest("hex");
}

export function setLocalEmployeePassword(email, password, metadata = {}) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) return false;

  resetStore.passwords.set(normalizedEmail, {
    passwordHash: createHash(password),
    role: normalizeRole(metadata.role) || "Employee",
    name: metadata.name || getDisplayName(normalizedEmail),
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

function getDisplayName(email) {
  return normalizeEmail(email)
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Talme User";
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

function getEmployeePasswordKey(employee) {
  return normalizeEmail(employee?.email) || String(employee?.employeeId || "").trim().toLowerCase();
}

export async function getLocalLoginAccount(identifier, password, expectedRole) {
  const normalizedEmail = normalizeEmail(identifier);
  const resolvedRole = normalizeRole(expectedRole);
  const account = getLocalAccountByEmail(normalizedEmail);

  if (["Employee", "Employee HRMS"].includes(resolvedRole)) {
    const employee = await getEmployeeByIdentifier(identifier);
    const employeeEmail = normalizeEmail(employee?.email);
    const savedPassword = resetStore.passwords.get(employeeEmail);
    const savedRole = normalizeRole(savedPassword?.role) || resolvedRole;

    if (!employee || !employeeEmail || (resolvedRole && savedRole !== resolvedRole) || !passwordMatches(savedPassword, password)) {
      return null;
    }

    return {
      id: employee.id || employee.employeeId,
      name: employee.name || employee.employeeId,
      email: employeeEmail,
      role: savedRole,
      employeeId: employee.employeeId || null
    };
  }

  if (!account || (resolvedRole && account.role !== resolvedRole)) {
    const savedPassword = resetStore.passwords.get(normalizedEmail);
    const savedRole = normalizeRole(savedPassword?.role);

    if (!savedPassword || (resolvedRole && savedRole !== resolvedRole) || !passwordMatches(savedPassword, password)) {
      return null;
    }

    return {
      id: `local-${normalizedEmail}`,
      name: savedPassword.name || getDisplayName(normalizedEmail),
      email: normalizedEmail,
      role: savedRole || resolvedRole || "HR",
      employeeId: null
    };
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
  const normalizedEmail = normalizeEmail(identifier);

  if (resetStore.passwords.has(normalizedEmail)) {
    return true;
  }

  const account = getLocalAccountByEmail(identifier);

  if (account && resetStore.passwords.has(account.email)) {
    return true;
  }

  const employee = await getEmployeeByIdentifier(identifier);
  const employeeKey = getEmployeePasswordKey(employee);
  return Boolean(employeeKey && resetStore.passwords.has(employeeKey));
}

async function sendOtpEmail(email, otp) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`Password reset OTP for ${email}: ${otp}`);
      return { delivered: false, devOtp: otp };
    }

    throw createError("Email service is not configured. Add RESEND_API_KEY, EMAIL_USER and EMAIL_PASS, or SMTP credentials in .env, then restart the server.", 503);
  }

  await sendEmail(
    email,
    "Talme HRMS password reset OTP",
    `<p>Your Talme HRMS password reset OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
    {
      text: `Your Talme HRMS password reset OTP is ${otp}. It expires in 10 minutes.`
    }
  );

  return { delivered: true };
}

export async function requestLocalPasswordReset(payload) {
  const role = normalizeRole(payload?.role);
  const identifier = String(payload?.identifier || payload?.email || "").trim();
  let email = normalizeEmail(identifier);

  if (!identifier) {
    throw createError(role === "Employee" ? "Enter Employee ID first." : "Enter your email first.");
  }

  if (usesEmployeeIdIdentifier(role) && identifier.includes("@")) {
    throw createError("Enter Employee ID, not email.");
  }

  if (usesEmployeeIdIdentifier(role) || !identifier.includes("@")) {
    const employee = await getEmployeeByIdentifier(identifier);
    email = normalizeEmail(employee?.email);

    if (!email) {
      throw createError("No registered email was found for that Employee ID.", 404);
    }
  }

  const otp = createOtp();
  resetStore.otps.set(email, {
    otpHash: createHash(otp),
    expiresAt: Date.now() + RESET_TTL_MS,
    attempts: 0,
    role: role || "HR",
    name: getDisplayName(email)
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

export async function confirmLocalPasswordReset(payload) {
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

  const role = normalizeRole(payload?.role) || normalizeRole(record.role) || "HR";

  if (hasPersistentDatabase) {
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { email },
      update: {
        active: true,
        name: record.name || getDisplayName(email),
        passwordHash,
        role
      },
      create: {
        active: true,
        email,
        name: record.name || getDisplayName(email),
        passwordHash,
        role
      }
    });
  }

  resetStore.passwords.set(email, {
    passwordHash: createHash(password),
    role,
    name: record.name || getDisplayName(email),
    updatedAt: new Date().toISOString()
  });
  writePasswordStoreFile(resetStore.passwords);
  resetStore.otps.delete(email);

  return {
    message: "Password changed successfully. You can sign in with the new password."
  };
}
