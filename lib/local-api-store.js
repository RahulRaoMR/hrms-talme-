import fs from "node:fs";
import path from "node:path";
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
const storeFilePath = path.join(process.cwd(), ".talme-local-api-store.json");

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
    globalStore.talmeLocalApiStore = readStoreFile() || createSeedStore();
  }

  return globalStore.talmeLocalApiStore;
}

function createSeedStore() {
  return Object.fromEntries(
    Object.entries(seedLoaders).map(([resource, load]) => [resource, load()])
  );
}

function readStoreFile() {
  try {
    if (!fs.existsSync(storeFilePath)) return null;

    const parsed = JSON.parse(fs.readFileSync(storeFilePath, "utf8"));

    return {
      ...createSeedStore(),
      ...parsed
    };
  } catch {
    return null;
  }
}

function writeStoreFile(store) {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("Unable to persist local API store.", error);
  }
}

export function getResource(resource) {
  const store = getStore();
  return store[resource] || null;
}

export function getLocalSuiteData() {
  return {
    employees: getResource("employees") || [],
    leaveRequests: getResource("leave-requests") || [],
    attendanceRecords: getResource("attendance-records") || [],
    vendorWorkers: getResource("vendor-workers") || [],
    documents: getResource("documents") || [],
    approvals: getResource("approvals") || [],
    settings: getResource("settings") || []
  };
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
  writeStoreFile(store);
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

  if (updated) {
    writeStoreFile(store);
  }

  return updated;
}

export function deleteResource(resource, id) {
  const store = getStore();

  if (!store[resource]) return false;

  const previousLength = store[resource].length;
  store[resource] = store[resource].filter((row) => String(row.id) !== String(id));

  const deleted = store[resource].length !== previousLength;

  if (deleted) {
    writeStoreFile(store);
  }

  return deleted;
}
