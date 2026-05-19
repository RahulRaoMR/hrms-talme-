import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";

const reportResources = [
  "employees",
  "leave-requests",
  "attendance-records",
  "vendor-workers",
  "documents",
  "approvals",
  "candidates",
  "vendors",
  "invoices",
  "notifications"
];

async function readResource(resource) {
  const persistentRows = await listPersistentResource(resource);

  if (Array.isArray(persistentRows)) {
    return persistentRows;
  }

  return getResource(resource) || [];
}

function statusText(value) {
  return String(value || "").trim().toLowerCase();
}

function isOpenLeave(item) {
  const status = statusText(item.status);
  return !["approved", "rejected", "cancelled", "canceled"].includes(status);
}

function isAttendanceException(item) {
  const lockState = statusText(item.lockState || item.status);
  return lockState && !["locked", "approved", "closed"].includes(lockState);
}

function isDocumentRisk(item) {
  return statusText(item.status) !== "verified";
}

function isOpenApproval(item) {
  return !["approved", "rejected", "closed"].includes(statusText(item.status));
}

function isInvoiceReview(item) {
  return !["approved", "paid", "released", "closed"].includes(statusText(item.status || item.label));
}

function groupChart(items, field) {
  const groups = items.reduce((acc, item) => {
    const label = String(item[field] || "Unknown").trim() || "Unknown";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(groups).map(([label, value], index) => ({
    label: label.slice(0, 10),
    value: String(value),
    height: Math.min(96, 30 + value * 14 + index * 2)
  }));
}

export function buildReportData(resources) {
  const employees = resources.employees || [];
  const leaveRequests = resources["leave-requests"] || [];
  const attendanceRecords = resources["attendance-records"] || [];
  const vendorWorkers = resources["vendor-workers"] || [];
  const documents = resources.documents || [];
  const approvals = resources.approvals || [];
  const candidates = resources.candidates || [];
  const vendors = resources.vendors || [];
  const invoices = resources.invoices || [];
  const notifications = resources.notifications || [];
  const invoiceReviewCount = invoices.filter(isInvoiceReview).length;

  return {
    updatedAt: new Date().toISOString(),
    scorecards: [
      { label: "Employees", value: String(employees.length), meta: "Master profiles live" },
      { label: "Pending Leave", value: String(leaveRequests.filter(isOpenLeave).length), meta: "Manager action needed" },
      { label: "Attendance Exceptions", value: String(attendanceRecords.filter(isAttendanceException).length), meta: "T&A review queue" },
      { label: "Vendor Workers", value: String(vendorWorkers.length), meta: "Deployed manpower" },
      { label: "Document Risks", value: String(documents.filter(isDocumentRisk).length), meta: "KYC/compliance attention" },
      { label: "Open Approvals", value: String(approvals.filter(isOpenApproval).length), meta: "Cross-module inbox" },
      { label: "Notifications Sent", value: String(notifications.filter((item) => statusText(item.status) === "sent").length), meta: "Email, SMS, WhatsApp, dashboard" }
    ],
    aiSignals: [
      `${candidates.length} ATS records indicate stable hiring demand.`,
      `${vendors.length} vendors support staffing, transport, food, security, and facility operations.`,
      `${invoiceReviewCount} payroll/vendor invoices should be cleared before salary payment release.`
    ],
    charts: {
      departments: groupChart(employees, "department"),
      sourcing: groupChart(candidates, "source"),
      invoices: groupChart(invoices, "status")
    }
  };
}

export async function getLiveReportData() {
  const entries = await Promise.all(
    reportResources.map(async (resource) => [resource, await readResource(resource)])
  );

  return buildReportData(Object.fromEntries(entries));
}
