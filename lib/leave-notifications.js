import { getResource } from "@/lib/local-api-store";
import { isEmailConfigured, sendEmail } from "@/lib/email-service";
import { listPersistentResource } from "@/lib/prisma-store";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getLeaveEmailStatus(status) {
  return ["accepted", "leave accepted", "approved"].includes(normalize(status)) ? "Accepted" : status || "Updated";
}

async function getEmployees() {
  return (await listPersistentResource("employees")) || getResource("employees") || [];
}

async function findEmployeeByLeaveReference(leaveRequest) {
  const lookup = normalize(leaveRequest?.employee);

  if (!lookup) return null;

  const employees = await getEmployees();
  return (
    employees.find((employee) => normalize(employee.employeeId) === lookup) ||
    employees.find((employee) => normalize(employee.name) === lookup) ||
    employees.find((employee) => normalize(employee.email) === lookup) ||
    null
  );
}

function buildLeaveStatusEmail(employee, leaveRequest) {
  const emailStatus = getLeaveEmailStatus(leaveRequest?.status);

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <div style="border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f766e, #1d4ed8); color: #ffffff; padding: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Talme HRMS</p>
          <h2 style="margin: 0; font-size: 28px;">Leave ${escapeHtml(emailStatus)}</h2>
        </div>
        <div style="padding: 24px;">
          <p>Hi ${escapeHtml(employee?.name || leaveRequest?.employee || "Employee")},</p>
          <p>Your leave request has been <strong>${escapeHtml(emailStatus)}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; border: 1px solid #e5e7eb;">
            <tbody>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Leave Type</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${escapeHtml(leaveRequest?.leaveType || "-")}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Dates</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${escapeHtml(leaveRequest?.dates || "-")}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Reason</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${escapeHtml(leaveRequest?.reason || "No reason provided")}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #6b7280;">Status</td>
                <td style="padding: 10px 12px; font-weight: 700;">${escapeHtml(emailStatus)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export async function sendLeaveStatusNotification(previousLeave, nextLeave) {
  if (!nextLeave?.status || normalize(previousLeave?.status) === normalize(nextLeave.status)) {
    return { sent: false, skipped: true, reason: "Leave status did not change." };
  }

  const employee = await findEmployeeByLeaveReference(nextLeave);

  if (!employee?.email) {
    return { sent: false, reason: "No registered employee email found." };
  }

  if (!isEmailConfigured()) {
    return { sent: false, reason: "Email service is not configured." };
  }

  const emailStatus = getLeaveEmailStatus(nextLeave.status);

  try {
    const info = await sendEmail(employee.email, `Leave ${emailStatus}`, buildLeaveStatusEmail(employee, nextLeave), {
      text: `Hi ${employee.name || nextLeave.employee || "Employee"}, your leave request for ${nextLeave.dates || "-"} is ${emailStatus}. Reason: ${nextLeave.reason || "No reason provided"}.`
    });

    return { sent: true, reason: info?.messageId || info?.response || "Email delivered." };
  } catch (error) {
    console.error("Leave status email failed:", error);
    return { sent: false, reason: error?.message || "Email delivery failed." };
  }
}
