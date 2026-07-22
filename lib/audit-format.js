const resourceLabels = {
  candidates: "Candidate",
  "job-openings": "Job Opening",
  recruiters: "Recruiter",
  "harmonized-roles": "Harmonized Role",
  vendors: "Vendor",
  invoices: "Invoice",
  "invoice-parties": "Invoice Party",
  users: "User",
  employees: "Employee",
  "leave-requests": "Leave Request",
  "attendance-records": "Attendance Record",
  "punch-activity": "Punch Activity",
  "vendor-workers": "Vendor Worker",
  documents: "Document",
  uploads: "Upload",
  approvals: "Approval",
  settings: "Setting",
  notifications: "Notification",
  "daily-updates": "Daily Update"
};

const actionLabels = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  LOGIN: "Logged in",
  VIEW: "Viewed",
  CLICK: "Clicked",
  UPLOAD: "Uploaded",
  SEND: "Sent"
};

export function getAuditEntity(resource) {
  return resourceLabels[resource] || titleCase(resource);
}

export function buildAuditDetail(action, resource, row = {}, id = "") {
  const verb = actionLabels[action] || titleCase(action);
  const entity = getAuditEntity(resource);
  const name = getRecordName(resource, row, id);
  return name ? `${verb} ${entity} ${name}` : `${verb} ${entity}`;
}

export function getAuditActorFromRequest(request, fallback = "system") {
  return (
    request?.headers?.get?.("x-talme-actor") ||
    request?.headers?.get?.("x-user-email") ||
    fallback
  );
}

function getRecordName(resource, row = {}, id = "") {
  const value =
    row.name ||
    row.employeeId ||
    row.jobId ||
    row.recruiterId ||
    row.vendor ||
    row.invoiceNo ||
    row.owner ||
    row.title ||
    row.subject ||
    row.label ||
    row.docType ||
    row.workerId ||
    row.position ||
    row.email ||
    id;

  return String(value || "").trim();
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}
