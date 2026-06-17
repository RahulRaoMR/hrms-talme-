import { sendEmail } from "@/backend/services/emailService";
import { escapeHtml, renderEmailShell } from "@/backend/services/templates/shared";
import { createPayslipPdf } from "@/lib/payslip-pdf";
import { formatPayslipMonth, normalizePayslipMonth, upsertPayslipRecord } from "@/lib/payslip-store";

function hasEmail(value) {
  return String(value || "").includes("@");
}

function buildPayslipEmail(row, periodLabel) {
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

async function sharePayslip(row, monthKey, periodLabel) {
  const pdf = createPayslipPdf([{ ...row, month: periodLabel }]);
  const record = upsertPayslipRecord({
    ...row,
    monthKey,
    monthLabel: periodLabel
  });

  if (!hasEmail(row.email)) {
    return {
      employeeId: row.employeeId,
      stored: true,
      sent: false,
      skipped: true,
      reason: "Missing registered email."
    };
  }

  try {
    const info = await sendEmail(
      row.email,
      `Payslip shared for ${periodLabel}`,
      buildPayslipEmail(row, periodLabel),
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

    return {
      employeeId: row.employeeId,
      payslipId: record?.id,
      stored: true,
      sent: true,
      skipped: false,
      reason: info.messageId || info.response || "Email delivered."
    };
  } catch (error) {
    return {
      employeeId: row.employeeId,
      payslipId: record?.id,
      stored: true,
      sent: false,
      skipped: false,
      reason: error?.message || "Email delivery failed."
    };
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const monthKey = normalizePayslipMonth(body.month);
    const periodLabel = body.month || formatPayslipMonth(monthKey);
    const results = [];

    for (const row of rows) {
      results.push(await sharePayslip(row, monthKey, periodLabel));
    }

    const stored = results.filter((result) => result.stored).length;
    const sent = results.filter((result) => result.sent).length;
    const skipped = results.filter((result) => result.skipped).length;
    const failed = results.length - sent - skipped;

    return Response.json({
      stored,
      sent,
      skipped,
      failed,
      periodLabel,
      results
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to share payslips." },
      { status: 500 }
    );
  }
}
