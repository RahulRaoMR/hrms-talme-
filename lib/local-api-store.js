import {
  getApprovalItems,
  getCompanySettings,
  getDocumentRecords,
  getEnterpriseSuiteData,
  getFrontendCandidates,
  getFrontendEmployees,
  getFrontendInvoices,
  getFrontendVendors,
  getNotifications,
  getUploadedAssets,
  getVendorWorkers
} from "@/lib/frontend-data";

const globalStore = globalThis;

const seedLoaders = {
  candidates: getFrontendCandidates,
  vendors: getFrontendVendors,
  invoices: getFrontendInvoices,
  users: () => [
    {
      id: "seed-user",
      name: "Talme Director",
      email: "director@talme.ai",
      role: "Enterprise Admin",
      active: true
    }
  ],
  employees: getFrontendEmployees,
  "leave-requests": () => getEnterpriseSuiteData().leaveRequests,
  "attendance-records": () => getEnterpriseSuiteData().attendanceRecords,
  "vendor-workers": getVendorWorkers,
  documents: getDocumentRecords,
  approvals: getApprovalItems,
  settings: getCompanySettings,
  uploads: getUploadedAssets,
  notifications: getNotifications
};

function getStore() {
  if (!globalStore.talmeLocalApiStore) {
    globalStore.talmeLocalApiStore = Object.fromEntries(
      Object.entries(seedLoaders).map(([resource, load]) => [resource, load()])
    );
  }

  return globalStore.talmeLocalApiStore;
}

export function getResource(resource) {
  const store = getStore();
  return store[resource] || null;
}

export function createResource(resource, payload) {
  const store = getStore();

  if (!store[resource]) return null;

  const row = {
    id: payload?.id || `${resource}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload
  };

  if (resource === "users") {
    delete row.password;
    delete row.passwordHash;
  }

  store[resource] = [row, ...store[resource]];
  return row;
}

export function updateResource(resource, id, payload) {
  const store = getStore();

  if (!store[resource]) return null;

  let updated = null;

  store[resource] = store[resource].map((row) => {
    if (String(row.id) !== String(id)) return row;

    updated = {
      ...row,
      ...payload,
      id: row.id,
      updatedAt: new Date().toISOString()
    };

    if (resource === "users") {
      delete updated.password;
      delete updated.passwordHash;
    }

    return updated;
  });

  return updated;
}

export function deleteResource(resource, id) {
  const store = getStore();

  if (!store[resource]) return false;

  const previousLength = store[resource].length;
  store[resource] = store[resource].filter((row) => String(row.id) !== String(id));

  return store[resource].length !== previousLength;
}
