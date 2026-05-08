import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";
import { sendEmail, isEmailConfigured } from "@/services/emailService";
import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

const RESET_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const globalForReset = globalThis;
const resetOtps = globalForReset.talmePasswordResetOtps || new Map();

if (process.env.NODE_ENV !== "production") {
  globalForReset.talmePasswordResetOtps = resetOtps;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim();
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isExpired(record) {
  return !record || record.expiresAt < Date.now();
}

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDisplayName(email) {
  return email
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function requestPasswordReset(payload) {
  const identifier = normalizeIdentifier(payload?.identifier || payload?.email);
  const role = String(payload?.role || "").trim().toLowerCase();
  let email = normalizeEmail(payload?.email);
  let employeeContext = null;

  if (role === "employee" || (identifier && !identifier.includes("@"))) {
    const employee = await prisma.employee.findFirst({
      where: {
        employeeId: {
          equals: identifier,
          mode: "insensitive"
        }
      },
      select: { employeeId: true, email: true, name: true, department: true, manager: true }
    });
    employeeContext = employee;

    email = normalizeEmail(employee?.email);

    if (!email) {
      throw createError("No registered email was found for that Employee ID.", 404);
    }
  } else if (identifier.includes("@")) {
    email = normalizeEmail(identifier);
  }

  if (!email) {
    throw createError(role === "employee" ? "Enter your Employee ID first." : "Enter your corporate email address.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, active: true }
  });

  if ((!user || !user.active) && process.env.NODE_ENV === "production") {
    throw createError("No active account was found for that email.", 404);
  }

  const otp = createOtp();
  resetOtps.set(email, {
    otpHash: await bcrypt.hash(otp, 10),
    expiresAt: Date.now() + RESET_TTL_MS,
    attempts: 0,
    createAccount: !user && process.env.NODE_ENV !== "production"
  });
  const recipientName = employeeContext?.name || user?.name || getDisplayName(email);
  const requestedFor = role === "employee"
    ? `
      <div style="margin: 18px 0; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <p style="margin: 0 0 8px; font-weight: 700;">Employee password reset</p>
        <p style="margin: 0;">Employee ID: <strong>${escapeHtml(employeeContext?.employeeId || identifier)}</strong></p>
        <p style="margin: 4px 0 0;">Employee name: <strong>${escapeHtml(employeeContext?.name || recipientName)}</strong></p>
        <p style="margin: 4px 0 0;">Department: <strong>${escapeHtml(employeeContext?.department || "-")}</strong></p>
        <p style="margin: 4px 0 0;">Manager: <strong>${escapeHtml(employeeContext?.manager || "-")}</strong></p>
        <p style="margin: 4px 0 0;">Registered email: <strong>${escapeHtml(email)}</strong></p>
      </div>
    `
    : `
      <div style="margin: 18px 0; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <p style="margin: 0 0 8px; font-weight: 700;">Account password reset</p>
        <p style="margin: 0;">Account email: <strong>${escapeHtml(email)}</strong></p>
      </div>
    `;

  const html = renderEmailShell(
    "Password reset OTP",
    `
      <p>Hello ${escapeHtml(recipientName)},</p>
      <p>We received a request to reset your Talme HRMS password. Use the one-time password below to continue.</p>
      ${requestedFor}
      <div style="margin: 20px 0; padding: 18px; border-radius: 14px; background: #111827; color: #ffffff; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #d1d5db;">Your OTP</p>
        <p style="font-size: 34px; font-weight: 800; letter-spacing: 0.22em; margin: 0;">${otp}</p>
        <p style="margin: 10px 0 0; color: #d1d5db;">Valid for 10 minutes</p>
      </div>
      <p>Enter this OTP on the password reset screen, then create your new password.</p>
      <p>For your security, do not share this OTP with anyone. Talme HRMS will never ask for your OTP outside the reset screen.</p>
      <p>If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    `
  );

  if (isEmailConfigured()) {
    try {
      await sendEmail(email, "Talme HRMS password reset OTP", html, {
        text: `Your Talme HRMS password reset OTP is ${otp}. It expires in 10 minutes.`
      });
    } catch (error) {
      resetOtps.delete(email);
      console.error("Password reset email failed:", error);
      throw createError(
        "Unable to send OTP. Check RESEND_API_KEY or sender email settings in .env.",
        503
      );
    }

    return {
      email,
      message: user
        ? "OTP sent to your registered email account."
        : "OTP sent. This development account will be created after verification."
    };
  }

  resetOtps.delete(email);
  throw createError("Email service is not configured. Add RESEND_API_KEY or sender email settings in .env, then restart the server.", 503);
}

export async function confirmPasswordReset(payload) {
  const email = normalizeEmail(payload?.email);
  const otp = String(payload?.otp || "").trim();
  const password = String(payload?.password || "");

  if (!email || !otp || !password) {
    throw createError("Email, OTP, and new password are required.");
  }

  if (password.length < 6) {
    throw createError("Password must be at least 6 characters.");
  }

  const record = resetOtps.get(email);

  if (isExpired(record)) {
    resetOtps.delete(email);
    throw createError("OTP has expired. Please request a new one.", 410);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    resetOtps.delete(email);
    throw createError("Too many OTP attempts. Please request a new one.", 429);
  }

  const matches = await bcrypt.compare(otp, record.otpHash);

  if (!matches) {
    record.attempts += 1;
    resetOtps.set(email, record);
    throw createError("Invalid OTP. Please check your email and try again.", 401);
  }

  await ensureSeedData();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, active: true }
  });

  if ((!user || !user.active) && !record.createAccount) {
    resetOtps.delete(email);
    throw createError("No active account was found for that email.", 404);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (user) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash }
    });
  } else {
    await prisma.user.create({
      data: {
        name: getDisplayName(email),
        email,
        role: "Enterprise Admin",
        active: true,
        passwordHash
      }
    });
  }

  resetOtps.delete(email);
  return {
    message: user
      ? "Password changed successfully. You can sign in with the new password."
      : "Account created and password set. You can sign in with this email now."
    }
}
