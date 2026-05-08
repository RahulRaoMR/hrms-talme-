import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${escapeHtml(label)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${escapeHtml(value || "-")}</td>
    </tr>
  `;
}

export const welcomeTemplate = (employee, password) => {
  const name = employee?.name || "Team Member";

  return renderEmailShell(
    "Welcome to Talme",
    `
      <p>Hi ${escapeHtml(name)},</p>
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
      <p>We are glad to have you with us.</p>
    `
  );
};
