import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendEmail } from "@/services/emailService";
import { leaveTemplate } from "@/services/templates/leaveTemplate";
import { offerTemplate } from "@/services/templates/offerTemplate";
import { salaryTemplate } from "@/services/templates/salaryTemplate";
import { welcomeTemplate } from "@/services/templates/welcomeEmail";

function normalizeEmailAddress(value) {
  return String(value ?? "").trim();
}

function hasRecipientEmail(value) {
  const email = normalizeEmailAddress(value);
  return email.includes("@");
}

function isOfferStatus(status) {
  return ["approved", "offered", "selected", "offer released", "offer accepted"].includes(
    String(status || "").trim().toLowerCase()
  );
}

async function sendEmailSafely({ to, subject, html, text, context }) {
  const recipient = normalizeEmailAddress(to);

  if (!hasRecipientEmail(recipient)) {
    return { sent: false, reason: "Missing recipient email." };
  }

  if (!isEmailConfigured()) {
    return { sent: false, reason: "Email service is not configured." };
  }

  try {
    const info = await sendEmail(recipient, subject, html, { text });
    return {
      sent: true,
      reason: info.messageId || info.response || "Email delivered."
    };
  } catch (error) {
    console.error(`Email automation failed for ${context}:`, error);
    return {
      sent: false,
      reason: error?.message || "Email delivery failed."
    };
  }
}

async function findEmployeeByReference(reference) {
  const lookup = String(reference ?? "").trim();

  if (!lookup) {
    return null;
  }

  return prisma.employee.findFirst({
    where: {
      OR: [{ employeeId: lookup }, { name: lookup }]
    }
  });
}

export function shouldSendOfferEmail(previousStatus, nextStatus) {
  return !isOfferStatus(previousStatus) && isOfferStatus(nextStatus);
}

export async function sendWelcomeEmailToEmployee(employee) {
  return sendEmailSafely({
    to: employee?.email,
    subject: "Welcome to Talme",
    html: welcomeTemplate(employee?.name || "Team Member"),
    text: `Hi ${employee?.name || "Team Member"}, your employee account has been created successfully.`,
    context: "employee welcome"
  });
}

export async function sendOfferEmailToCandidate(candidate) {
  return sendEmailSafely({
    to: candidate?.email,
    subject: "Congratulations from Talme",
    html: offerTemplate(candidate?.name || "Candidate", candidate?.role || "your role"),
    text: `Dear ${candidate?.name || "Candidate"}, we are pleased to offer you the role of ${candidate?.role || "your role"}.`,
    context: "candidate offer"
  });
}

export async function sendLeaveStatusEmailToEmployee(leaveRequest) {
  const employee = await findEmployeeByReference(leaveRequest?.employee);

  return sendEmailSafely({
    to: employee?.email,
    subject: `Leave ${leaveRequest?.status || "Update"}`,
    html: leaveTemplate(
      employee?.name || leaveRequest?.employee || "Employee",
      leaveRequest?.status || "Updated",
      leaveRequest?.leaveType,
      leaveRequest?.dates
    ),
    text: `Hi ${employee?.name || leaveRequest?.employee || "Employee"}, your leave request status is ${leaveRequest?.status || "Updated"}.`,
    context: "leave status"
  });
}

export async function sendSalaryEmailToEmployee(employee, options = {}) {
  return sendEmailSafely({
    to: employee?.email,
    subject: options.subject || "Salary Processed",
    html: salaryTemplate(
      employee?.name || "Employee",
      options.amount,
      options.periodLabel || "this cycle"
    ),
    text: options.amount
      ? `Hi ${employee?.name || "Employee"}, your salary of ${options.amount} for ${options.periodLabel || "this cycle"} has been processed.`
      : `Hi ${employee?.name || "Employee"}, your salary for ${options.periodLabel || "this cycle"} has been processed.`,
    context: "salary release"
  });
}

export async function releasePayrollEmails(options = {}) {
  const employees = options.employees || (await prisma.employee.findMany());
  const periodLabel = options.periodLabel || new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric"
  }).format(new Date());
  const onlyVerified = options.onlyVerified !== false;
  const eligibleEmployees = onlyVerified
    ? employees.filter((employee) => String(employee.bankStatus || "").trim().toLowerCase() === "verified")
    : employees;

  const results = [];

  for (const employee of eligibleEmployees) {
    results.push(
      await sendSalaryEmailToEmployee(employee, {
        periodLabel,
        amount: options.amountByEmployeeId?.[employee.id]
      })
    );
  }

  const sent = results.filter((result) => result.sent).length;

  return {
    total: employees.length,
    eligible: eligibleEmployees.length,
    sent,
    skipped: eligibleEmployees.length - sent,
    periodLabel
  };
}
