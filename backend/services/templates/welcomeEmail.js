import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${escapeHtml(label)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${escapeHtml(value || "-")}</td>
    </tr>
  `;
}

function getFrontendBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL;
  const baseUrl = String(configuredUrl || "http://localhost:3000").trim().replace(/^"|"$/g, "").replace(/\/$/, "");

  if (!baseUrl) {
    return "http://localhost:3000";
  }

  return baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
}

export const welcomeTemplate = (employee, password) => {
  const name = employee?.name || "Team Member";
  const loginUrl = `${getFrontendBaseUrl()}/employee-app/login`;

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
        <p style="margin: 0;">Login page: <a href="${escapeHtml(loginUrl)}" style="color: #0f766e; font-weight: 700;">${escapeHtml(loginUrl)}</a></p>
        <p style="margin: 0;">Employee ID: <strong>${escapeHtml(employee?.employeeId || "-")}</strong></p>
        <p style="margin: 4px 0 0;">Temporary password: <strong>${escapeHtml(password || "-")}</strong></p>
      </div>

      <p>Use these credentials to log in to the employee app, open attendance, and punch in or punch out.</p>
      <p>Please keep this password private.</p>
      <p>We are glad to have you with us.</p>
    `
  );
};
