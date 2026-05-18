import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { sendEmail, isEmailConfigured } from "@/lib/email-service";
import { hasPersistentDatabase, prisma } from "@/lib/prisma-store";
import { setLocalEmployeePassword } from "@/lib/password-reset-store";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmailShell(title, content) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <div style="border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f766e, #1d4ed8); color: #ffffff; padding: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Talme HRMS</p>
          <h2 style="margin: 0; font-size: 28px;">${escapeHtml(title)}</h2>
        </div>
        <div style="padding: 24px;">
          ${content}
        </div>
      </div>
    </div>
  `;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${escapeHtml(label)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${escapeHtml(value || "-")}</td>
    </tr>
  `;
}

function generateEmployeePassword() {
  return `Talme@${randomBytes(4).toString("hex")}`;
}

function getEmployeeLoginEmail(employee) {
  return String(employee?.email || "").trim().toLowerCase();
}

function buildWelcomeEmail(employee, password) {
  return renderEmailShell(
    "Welcome to Talme",
    `
      <p>Hi ${escapeHtml(employee?.name || "Team Member")},</p>
      <p>Your employee account has been created successfully.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <tbody>
          ${detailRow("Employee ID", employee?.employeeId)}
          ${detailRow("Employee Name", employee?.name)}
          ${detailRow("Department", employee?.department)}
          ${detailRow("Manager", employee?.manager)}
        </tbody>
      </table>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 18px 0;">
        <p style="margin: 0 0 8px; font-weight: 700;">Employee portal login</p>
        <p style="margin: 0;">Employee ID: <strong>${escapeHtml(employee?.employeeId || "-")}</strong></p>
        <p style="margin: 4px 0 0;">Temporary password: <strong>${escapeHtml(password || "-")}</strong></p>
      </div>

      <p>You can now log in and start using the platform for HRMS, payroll, attendance, and leave workflows.</p>
      <p>Please keep this password private.</p>
    `
  );
}

async function createEmployeeAccount(employee, password) {
  const loginEmail = getEmployeeLoginEmail(employee);

  if (!loginEmail) {
    return { created: false, reason: "Missing employee email." };
  }

  if (!hasPersistentDatabase) {
    setLocalEmployeePassword(loginEmail, password);
    return { created: true };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: loginEmail },
    update: {
      name: employee.name,
      role: "Employee",
      active: true,
      passwordHash
    },
    create: {
      name: employee.name,
      email: loginEmail,
      role: "Employee",
      active: true,
      passwordHash
    }
  });

  return { created: true };
}

export async function onboardEmployee(employee) {
  const loginEmail = getEmployeeLoginEmail(employee);

  if (!loginEmail) {
    return { accountCreated: false, emailSent: false, reason: "Missing employee email." };
  }

  const password = generateEmployeePassword();
  const account = await createEmployeeAccount(employee, password);

  if (!account.created) {
    return { accountCreated: false, emailSent: false, reason: account.reason };
  }

  if (!isEmailConfigured()) {
    return { accountCreated: true, emailSent: false, reason: "Email service is not configured." };
  }

  try {
    const info = await sendEmail(loginEmail, "Welcome to Talme", buildWelcomeEmail(employee, password), {
      text: `Hi ${employee?.name || "Team Member"}, your employee account has been created successfully. Employee ID: ${employee?.employeeId || "-"}. Temporary password: ${password}.`
    });

    return {
      accountCreated: true,
      emailSent: true,
      reason: info?.messageId || info?.response || "Email delivered."
    };
  } catch (error) {
    console.error("Employee welcome email failed:", error);
    return {
      accountCreated: true,
      emailSent: false,
      reason: error?.message || "Email delivery failed."
    };
  }
}
