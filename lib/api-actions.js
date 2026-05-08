import { apiUrl } from "@/lib/api-client";

const endpoints = {
  candidates: "/api/candidates",
  vendors: "/api/vendors",
  invoices: "/api/invoices",
  users: "/api/users",
  employees: "/api/employees",
  leaveRequests: "/api/leave-requests",
  attendanceRecords: "/api/attendance-records",
  vendorWorkers: "/api/vendor-workers",
  documents: "/api/documents",
  approvals: "/api/approvals",
  settings: "/api/settings",
  uploads: "/api/uploads",
  notifications: "/api/notifications"
};

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

const create = (resource) => (payload) =>
  request(endpoints[resource], {
    method: "POST",
    body: JSON.stringify(payload)
  });

const update = (resource) => (id, payload) =>
  request(`${endpoints[resource]}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

const remove = (resource) => (id) =>
  request(`${endpoints[resource]}/${id}`, {
    method: "DELETE"
  });

const bulkCreate = (resource) => async (rows) => {
  const created = [];
  for (const row of rows) {
    created.push(await create(resource)(row));
  }
  return created;
};

const bulkDelete = (resource) => async (ids) => {
  for (const id of ids) {
    await remove(resource)(id);
  }
  return ids;
};

const approve = (resource) => async (id) =>
  update(resource)(id, {
    status: "Approved",
    tone: "teal"
  });

export const createCandidateAction = create("candidates");
export const importCandidatesAction = bulkCreate("candidates");
export const updateCandidateAction = update("candidates");
export const approveCandidateAction = approve("candidates");
export const deleteCandidateAction = remove("candidates");
export const bulkDeleteCandidatesAction = bulkDelete("candidates");

export const createVendorAction = create("vendors");
export const importVendorsAction = bulkCreate("vendors");
export const updateVendorAction = update("vendors");
export const approveVendorAction = approve("vendors");
export const deleteVendorAction = remove("vendors");
export const bulkDeleteVendorsAction = bulkDelete("vendors");

export const createInvoiceAction = create("invoices");
export const importInvoicesAction = bulkCreate("invoices");
export const updateInvoiceAction = update("invoices");
export const approveInvoiceAction = approve("invoices");
export const deleteInvoiceAction = remove("invoices");
export const bulkDeleteInvoicesAction = bulkDelete("invoices");

export const createUserAction = create("users");
export const updateUserAction = update("users");
export const deleteUserAction = remove("users");

export const createEmployeeAction = create("employees");
export const updateEmployeeAction = update("employees");
export const deleteEmployeeAction = remove("employees");

export const createLeaveRequestAction = create("leaveRequests");
export const updateLeaveRequestAction = update("leaveRequests");
export const deleteLeaveRequestAction = remove("leaveRequests");

export const createAttendanceRecordAction = create("attendanceRecords");
export const updateAttendanceRecordAction = update("attendanceRecords");
export const deleteAttendanceRecordAction = remove("attendanceRecords");

export const createVendorWorkerAction = create("vendorWorkers");
export const updateVendorWorkerAction = update("vendorWorkers");
export const deleteVendorWorkerAction = remove("vendorWorkers");

export const createDocumentRecordAction = create("documents");
export const updateDocumentRecordAction = update("documents");
export const deleteDocumentRecordAction = remove("documents");

export const createApprovalItemAction = create("approvals");
export const updateApprovalItemAction = update("approvals");
export const deleteApprovalItemAction = remove("approvals");

export const createCompanySettingAction = create("settings");
export const updateCompanySettingAction = update("settings");
export const deleteCompanySettingAction = remove("settings");

export const createUploadedAssetRecordAction = create("uploads");
export const deleteUploadedAssetAction = remove("uploads");

export const createNotificationAction = create("notifications");
export const updateNotificationAction = update("notifications");
export const deleteNotificationAction = remove("notifications");

export async function sendNotificationAction(id) {
  return request(`${endpoints.notifications}/${id}/send`, { method: "POST" });
}

export async function releasePayrollAction(periodLabel) {
  return request("/api/payroll/release", {
    method: "POST",
    body: JSON.stringify({ periodLabel })
  });
}
