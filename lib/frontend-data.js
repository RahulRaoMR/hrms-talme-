import {
  approvalSeed,
  attendanceSeed,
  demoSeed,
  documentSeed,
  employeeMasterSeed,
  leaveSeed,
  notificationSeed,
  settingSeed,
  uploadedAssetSeed,
  vendorWorkerSeed
} from "@/lib/demo-data";

function withIds(items, prefix) {
  return items.map((item, index) => ({
    id: item.id || `${prefix}-${index + 1}`,
    createdAt: item.createdAt || new Date(2026, 3, 1 + index).toISOString(),
    updatedAt: item.updatedAt || new Date(2026, 3, 1 + index).toISOString(),
    ...item
  }));
}

function paginate(items, page = 1, pageSize = 5) {
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize
  };
}

export function getFrontendEmployees() {
  return withIds(employeeMasterSeed, "employee");
}

export function getFrontendCandidates() {
  return withIds(demoSeed.candidates, "candidate");
}

export function getFrontendVendors() {
  return withIds(demoSeed.vendors, "vendor");
}

export function getFrontendInvoices() {
  return withIds(demoSeed.invoices, "invoice").map((invoice) => ({
    ...invoice,
    status: invoice.status || invoice.label
  }));
}

export function getFrontendDocuments() {
  return withIds(documentSeed, "document");
}

export function getEnterpriseSuiteData() {
  return {
    employees: getFrontendEmployees(),
    leaveRequests: withIds(leaveSeed, "leave"),
    attendanceRecords: withIds(attendanceSeed, "attendance"),
    vendorWorkers: withIds(vendorWorkerSeed, "vendor-worker"),
    documents: getFrontendDocuments(),
    approvals: withIds(approvalSeed, "approval"),
    settings: withIds(settingSeed, "setting")
  };
}

export function getApprovalItems() {
  return withIds(approvalSeed, "approval");
}

export function getDocumentRecords() {
  return getFrontendDocuments();
}

export function getUploadedAssets() {
  return withIds(uploadedAssetSeed, "asset");
}

export function getEmployeePortalData() {
  const data = getEnterpriseSuiteData();
  return {
    employees: data.employees,
    leaveRequests: data.leaveRequests,
    attendanceRecords: data.attendanceRecords,
    documents: data.documents.filter((item) => item.module === "Employee"),
    assets: getUploadedAssets().filter((item) => item.module === "Employee")
  };
}

export function getReportData() {
  const employees = getFrontendEmployees();
  const candidates = getFrontendCandidates();
  const vendors = getFrontendVendors();
  const invoices = getFrontendInvoices();
  const approvals = getApprovalItems();
  const documents = getFrontendDocuments();
  const notifications = getNotifications();

  return {
    scorecards: [
      { label: "Employees", value: String(employees.length), meta: "Master profiles live" },
      { label: "Pending Leave", value: String(leaveSeed.length), meta: "Manager action needed" },
      { label: "Attendance Exceptions", value: String(attendanceSeed.length), meta: "T&A review queue" },
      { label: "Vendor Workers", value: String(vendorWorkerSeed.length), meta: "Deployed manpower" },
      { label: "Document Risks", value: String(documents.filter((item) => item.status !== "Verified").length), meta: "KYC/compliance attention" },
      { label: "Open Approvals", value: String(approvals.filter((item) => item.status !== "Approved").length), meta: "Cross-module inbox" },
      { label: "Notifications Sent", value: String(notifications.filter((item) => item.status === "Sent").length), meta: "Email, SMS, WhatsApp, dashboard" }
    ],
    aiSignals: [
      `${candidates.length} ATS records indicate stable hiring demand.`,
      `${vendors.length} vendors support staffing, transport, food, security, and facility operations.`,
      `${invoices.length} payroll/vendor invoices are available for finance review.`
    ],
    charts: {
      departments: groupChart(employees, "department"),
      sourcing: groupChart(candidates, "source"),
      invoices: groupChart(invoices, "status")
    }
  };
}

export function getNotifications() {
  return withIds(notificationSeed, "notification");
}

export function getCompanySettings() {
  return withIds(settingSeed, "setting");
}

export function getJobOpenings() {
  return withIds(demoSeed.jobOpenings || [], "job-opening");
}

export function getRecruiters() {
  return withIds(demoSeed.recruiters || [], "recruiter");
}

export function getVendors({ page = 1 } = {}) {
  return paginate(getFrontendVendors(), page);
}

export function getVendorWorkers() {
  return withIds(vendorWorkerSeed, "vendor-worker");
}

export function getInvoices({ page = 1 } = {}) {
  return paginate(getFrontendInvoices(), page);
}

export function findFrontendRecord(type, id) {
  const records = {
    candidate: getFrontendCandidates(),
    employee: getFrontendEmployees(),
    document: getFrontendDocuments(),
    invoice: getFrontendInvoices(),
    vendor: getFrontendVendors()
  };

  return records[type]?.find((item) => item.id === id);
}

function groupChart(items, field) {
  const groups = items.reduce((acc, item) => {
    const label = item[field] || "Unknown";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(groups).map(([label, value], index) => ({
    label: label.slice(0, 10),
    value: String(value),
    height: Math.min(96, 30 + value * 14 + index * 2)
  }));
}
