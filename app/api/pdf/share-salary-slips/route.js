import { sendEmail } from "@/backend/services/emailService";
import { escapeHtml, renderEmailShell } from "@/backend/services/templates/shared";
import { createPayslipPdf } from "@/lib/payslip-pdf";
import { formatPayslipMonth, normalizePayslipMonth, upsertPayslipRecord } from "@/lib/payslip-store";

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

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const monthKey = normalizePayslipMonth(body.month);
  const periodLabel = body.month || formatPayslipMonth(monthKey);
  const results = [];

  for (const row of rows) {
    const pdf = createPayslipPdf([{ ...row, month: periodLabel }]);
    const stored = upsertPayslipRecord({
      ...row,
      employee: row.name || row.employee,
      band: row.band || row.salaryBand,
      monthKey,
      monthLabel: periodLabel,
      sharedBy: body.sharedBy || "Payroll"
    });

    if (!hasEmail(row.email)) {
      results.push({ employeeId: row.employeeId, sent: false, skipped: true, reason: "Missing registered email.", stored });
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
        reason: info.messageId || info.response || "Email delivered.",
        stored
      });
    } catch (error) {
      results.push({
        employeeId: row.employeeId,
        sent: false,
        skipped: false,
        reason: error?.message || "Email delivery failed.",
        stored
      });
    }
  }

  const sent = results.filter((result) => result.sent).length;
  const skipped = results.filter((result) => result.skipped).length;
  const failed = results.length - sent - skipped;

  return Response.json({
    sent,
    skipped,
    failed,
    stored: results.filter((result) => result.stored).length,
    periodLabel,
    results
  });
}
