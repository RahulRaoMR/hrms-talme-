import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

export const welcomeTemplate = (name) =>
  renderEmailShell(
    "Welcome to Talme",
    `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your employee account has been created successfully.</p>
      <p>You can now log in and start using the platform for HRMS, payroll, attendance, and leave workflows.</p>
      <p>We are glad to have you with us.</p>
    `
  );
