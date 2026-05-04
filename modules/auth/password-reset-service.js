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
  const email = normalizeEmail(payload?.email);

  if (!email) {
    throw createError("Enter your corporate email address.");
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
  const recipientName = user?.name || getDisplayName(email);

  const html = renderEmailShell(
    "Password reset OTP",
    `
      <p>Hello ${escapeHtml(recipientName)},</p>
      <p>Use this OTP to reset your Talme HRMS password. It expires in 10 minutes.</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.18em; margin: 18px 0;">${otp}</p>
      <p>If you did not request a password reset, you can ignore this email.</p>
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
      message: user
        ? "OTP sent to your email account."
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
