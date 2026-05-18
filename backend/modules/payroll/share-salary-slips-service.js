import { sendEmail } from "@/services/emailService";
import { escapeHtml, renderEmailShell } from "@/services/templates/shared";
import { createPayslipPdf } from "@/lib/payslip-pdf";
import { formatPayslipMonth, normalizePayslipMonth } from "@/lib/payslip-store";
import { prisma } from "@/lib/prisma";

function hasEmail(value) {
  return String(value || "").includes("@");
}

function buildEmail(row, periodLabel) {
  const employee = row.name || row.employee || "Employee";

  return renderEmailShell(
    "Payslip Shared",
    `
      <p>Hi ${escapeHtml(employee)},</p>
      <p>Your payslip for <strong>${escapeHtml(periodLabel)}</strong> has been shared.</p>
      <p>You can also download it from the employee app.</p>
    `
  );
}

export async function sharePayslips(rows, month, sharedBy) {
  const monthKey = normalizePayslipMonth(month);
  const periodLabel = month || formatPayslipMonth(monthKey);
  const results = [];

  for (const row of rows) {
    const pdf = createPayslipPdf([{ ...row, month: periodLabel }]);

    if (!hasEmail(row.email)) {
      results.push({
        employeeId: row.employeeId,
        sent: false,
        skipped: true,
        reason: "Missing registered email."
      });
      continue;
    }

    try {
      const info = await sendEmail(
        row.email,
        `Payslip shared for ${periodLabel}`,
        buildEmail(row, periodLabel),
        {
          text: `Hi ${row.name || "Employee"}, your payslip for ${periodLabel} has been shared.`,
          attachments: [
            {
              filename: `payslip-${row.employeeId || row.name || "employee"}-${monthKey}.pdf`,
              content: pdf,
              contentType: "application/pdf"
            }
          ]
        }
      );

      results.push({
        employeeId: row.employeeId,
        sent: true,
        skipped: false,
        reason: info.messageId || info.response || "Email delivered."
      });
    } catch (error) {
      results.push({
        employeeId: row.employeeId,
        sent: false,
        skipped: false,
        reason: error?.message || "Email delivery failed."
      });
    }
  }

  return results;
}
