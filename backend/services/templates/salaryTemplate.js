import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

export const salaryTemplate = (name, amount, periodLabel = "this cycle") => {
  const safeName = escapeHtml(name);
  const safeAmount = amount ? escapeHtml(amount) : "";
  const safePeriod = escapeHtml(periodLabel);

  return renderEmailShell(
    "Salary Released",
    amount
      ? `
          <p>Hi ${safeName},</p>
          <p>Your salary of <strong>${safeAmount}</strong> for <strong>${safePeriod}</strong> has been processed.</p>
          <p>Please check your bank account and payslip for confirmation.</p>
        `
      : `
          <p>Hi ${safeName},</p>
          <p>Your salary for <strong>${safePeriod}</strong> has been processed successfully.</p>
          <p>Please check your bank account and payslip for confirmation.</p>
        `
  );
};
