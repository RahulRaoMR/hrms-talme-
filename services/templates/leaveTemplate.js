import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

export const leaveTemplate = (name, status, leaveType, dates) =>
  renderEmailShell(
    `Leave ${escapeHtml(status)}`,
    `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your ${leaveType ? `<strong>${escapeHtml(leaveType)}</strong> ` : ""}leave request has been marked as <strong>${escapeHtml(status)}</strong>.</p>
      ${dates ? `<p>Requested dates: ${escapeHtml(dates)}</p>` : ""}
      <p>Please log in to Talme HRMS if you want to review the full request details.</p>
    `
  );
