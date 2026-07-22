import { unlink } from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  isAtsSharePointResource,
  maybeImportAtsFromSharePoint,
  queueAtsSharePointExport
} from "@/backend/lib/ats-sharepoint-sync";

const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//;

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const postgresUrl =
  [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL_NON_POOLING]
    .find((value) => POSTGRES_URL_PATTERN.test(String(value || "").replace(/^"|"$/g, "")));

export const hasPersistentDatabase = Boolean(postgresUrl);

export function isDatabaseUnavailableError(error) {
  const code = error?.code || error?.errorCode;
  const message = String(error?.message || "");

  return (
    ["P1000", "P1001", "P1003", "P1017"].includes(code) ||
    error?.name === "PrismaClientInitializationError" ||
    /can't reach database server|connection (?:refused|closed|terminated|timed out)/i.test(message)
  );
}

if (postgresUrl) {
  process.env.DATABASE_URL = postgresUrl.replace(/^"|"$/g, "");
} else if (databaseUrl) {
  console.warn("DATABASE_URL must be a PostgreSQL URL. Falling back to demo API storage.");
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.talmePrisma ||
  new PrismaClient({
    log: ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.talmePrisma = prisma;
}

const resourceMap = {
  candidates: { model: "candidate", orderBy: { createdAt: "desc" }, fields: ["jobId", "recruiterId", "recruiterName", "name", "role", "stage", "source", "status", "tone", "businessUnit", "domain", "client", "noticePeriod", "email", "phone", "qualification", "yearsOfExperience", "previousCompany", "previousCtc", "location", "preferredLocation", "expectedCtc", "sourceDate", "screeningDate", "screeningNotes", "tech1Date", "tech1Status", "tech1Remarks", "tech1Panel", "tech2Date", "tech2Status", "tech2Remarks", "tech2Panel", "tech3Date", "tech3Status", "tech3Remarks", "tech3Panel", "offerStageInputDate", "documentCollectionDate", "approvalDate", "offerDate", "offerStatus", "offerDecisionDate", "offerAcceptStatus", "joiningDate", "joiningStatus", "offeredCtc"] },
  "job-openings": { model: "jobOpening", orderBy: { postedDate: "desc" }, fields: ["jobId", "agingDays", "hireType", "postedDate", "businessUnit", "department", "client", "domain", "position", "priority", "numberOfOpenings", "status", "remarks", "candidateConcerned", "holdDate", "offerStageDate", "offerDate", "joiningDate", "candidateCtc", "source", "harmonizedRole", "recruiterTagged", "originalJobPostDate", "tone"] },
  vendors: { model: "vendor", orderBy: { createdAt: "desc" }, fields: ["vendor", "category", "sites", "rating", "status", "tone"] },
  invoices: { model: "invoice", orderBy: { createdAt: "desc" }, fields: ["vendor", "invoiceNo", "attendance", "amount", "tds", "status", "tone"] },
  "invoice-parties": { model: "invoiceParty", orderBy: { updatedAt: "desc" }, fields: ["name", "gstin", "phone", "gstType", "state", "email", "billing", "shipping"] },
  users: { model: "user", orderBy: { createdAt: "desc" }, fields: ["name", "email", "role", "active"] },
  employees: { model: "employee", orderBy: { createdAt: "desc" }, fields: ["employeeId", "email", "name", "department", "location", "manager", "grade", "joiningDate", "salaryBand", "salaryNetPay", "bankStatus", "status", "tone", "employeeDetails"] },
  "leave-requests": { model: "leaveRequest", orderBy: { createdAt: "desc" }, fields: ["employee", "leaveType", "dates", "balance", "reason", "approver", "status", "tone"] },
  "attendance-records": { model: "attendanceRecord", orderBy: { createdAt: "desc" }, fields: ["employee", "salaryNetPay", "month", "monthDays", "sundays", "holidays", "paidLeaves", "otHours", "present", "leaves", "overtime", "shift", "lockState", "tone"] },
  "punch-activity": { model: "punchActivity", orderBy: { timestamp: "desc" }, fields: ["employeeId", "employeeName", "type", "timestamp", "time", "workDate", "geoCoordinates"] },
  "vendor-workers": { model: "vendorWorker", orderBy: { createdAt: "desc" }, fields: ["workerId", "name", "vendor", "site", "skill", "wageRate", "attendance", "status", "tone"] },
  documents: { model: "documentRecord", orderBy: { createdAt: "desc" }, fields: ["owner", "docType", "module", "expiry", "status", "tone"] },
  approvals: { model: "approvalItem", orderBy: { createdAt: "desc" }, fields: ["module", "title", "owner", "amount", "level", "status", "tone"] },
  settings: { model: "companySetting", orderBy: { category: "asc" }, fields: ["category", "name", "value", "status"] },
  uploads: { model: "uploadedAsset", orderBy: { createdAt: "desc" }, fields: ["module", "owner", "label", "fileName", "fileUrl", "mimeType", "sizeLabel", "status"] },
  notifications: { model: "notification", orderBy: { createdAt: "desc" }, fields: ["subject", "audience", "recipients", "channel", "message", "status", "tone", "providerResult", "providerError"] },
  "daily-updates": { model: "dailyUpdate", orderBy: { createdAt: "desc" }, fields: ["authorName", "authorEmail", "authorRole", "message"] }
};

const numericFieldsByResource = {
  employees: ["salaryNetPay"],
  "attendance-records": ["salaryNetPay", "monthDays", "sundays", "holidays", "paidLeaves", "otHours", "present", "leaves", "overtime"]
};

const integerFieldsByResource = {
  "attendance-records": ["monthDays", "sundays", "holidays", "paidLeaves", "present", "leaves", "overtime"]
};

function getConfig(resource) {
  return resourceMap[resource] || null;
}

function getModel(config) {
  return prisma[config.model];
}

function getGeneratedModelFields(modelName) {
  const model = Prisma.dmmf.datamodel.models.find((item) => item.name.toLowerCase() === modelName.toLowerCase());

  return new Set(model?.fields.map((field) => field.name) || []);
}

function coerceFieldValue(value, field) {
  if (!field) return value;

  if (value === "" && !field.isRequired) {
    return null;
  }

  if (field.type === "Int") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (field.type === "Float") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (field.type === "Boolean") {
    if (typeof value === "boolean") return value;
    return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
  }

  if (field.type === "Json" && typeof value === "string") {
    return JSON.parse(value);
  }

  if (field.type === "DateTime") {
    return value instanceof Date ? value : new Date(value);
  }

  return value;
}

function pick(payload, fields, fieldMap = new Map()) {
  return fields.reduce((data, field) => {
    if (payload?.[field] !== undefined) {
      data[field] = payload[field];
    }

    return data;
  }, {});
}

function pickGeneratedFields(payload, config) {
  const generatedFields = getGeneratedModelFields(config.model);

  if (!generatedFields.size) {
    return pick(payload, config.fields);
  }

  return pick(
    payload,
    config.fields.filter((field) => generatedFields.has(field))
  );
}

function coerceResourceFields(resource, data) {
  const numericFields = numericFieldsByResource[resource] || [];
  const integerFields = new Set(integerFieldsByResource[resource] || []);

  return numericFields.reduce((nextData, field) => {
    if (nextData[field] === undefined) {
      return nextData;
    }

    const numericValue = Number(nextData[field]) || 0;

    return {
      ...nextData,
      [field]: integerFields.has(field) ? Math.trunc(numericValue) : numericValue
    };
  }, data);
}

function safeRow(resource, row) {
  if (resource !== "users" || !row) return row;

  const { passwordHash: _passwordHash, ...safe } = row;
  return safe;
}

function requiredUserString(payload, field, label) {
  const value = String(payload?.[field] || "").trim();

  if (!value) {
    const error = new Error(`${label} is required.`);
    error.status = 400;
    throw error;
  }

  return value;
}

function coerceUserActive(value) {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;

  return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
}

async function createUserData(payload) {
  const password = requiredUserString(payload, "password", "Password");

  return {
    name: requiredUserString(payload, "name", "Name"),
    email: requiredUserString(payload, "email", "Email").toLowerCase(),
    role: requiredUserString(payload, "role", "Role"),
    active: coerceUserActive(payload?.active),
    passwordHash: await bcrypt.hash(password, 10)
  };
}

async function updateUserData(payload) {
  const data = {};

  if (payload?.name !== undefined) {
    data.name = requiredUserString(payload, "name", "Name");
  }

  if (payload?.email !== undefined) {
    data.email = requiredUserString(payload, "email", "Email").toLowerCase();
  }

  if (payload?.role !== undefined) {
    data.role = requiredUserString(payload, "role", "Role");
  }

  if (payload?.active !== undefined) {
    data.active = coerceUserActive(payload.active);
  }

  const password = String(payload?.password || "").trim();

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  return data;
}

export async function listPersistentResource(resource) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  try {
    await refreshAtsResourceFromSharePoint(resource);
    const rows = await getModel(config).findMany({ orderBy: config.orderBy });
    return rows.map((row) => safeRow(resource, row));
  } catch (error) {
    console.error("Persistent audit log list failed.", error);
    return null;
  }
}

export async function createPersistentResource(resource, payload) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  const row = await getModel(config).create({
    data: resource === "users"
      ? await createUserData(payload)
      : coerceResourceFields(resource, pickGeneratedFields(payload, config))
  });

  queueAtsResourceExport(resource);
  return safeRow(resource, row);
}

export async function getPersistentResource(resource, id) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  try {
    const row = await getModel(config).findUnique({ where: { id } });
    return safeRow(resource, row);
  } catch (error) {
    console.error("Persistent audit log write failed.", error);
    return null;
  }
}

export async function updatePersistentResource(resource, id, payload) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  const row = await getModel(config).update({
    where: { id },
    data: resource === "users"
      ? await updateUserData(payload)
      : coerceResourceFields(resource, pickGeneratedFields(payload, config))
  });

  queueAtsResourceExport(resource);
  return safeRow(resource, row);
}

export async function deletePersistentResource(resource, id) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  const uploadRow = resource === "uploads" ? await getModel(config).findUnique({ where: { id } }) : null;

  await getModel(config).delete({ where: { id } });
  await deleteLocalUploadedFile(uploadRow?.fileUrl);
  queueAtsResourceExport(resource);
  return { id };
}

export async function listPersistentAuditLogs(limit = 500) {
  if (!hasPersistentDatabase) return null;

  try {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    });
  } catch (error) {
    console.error("Persistent audit log list failed.", error);
    return null;
  }
}

export async function createPersistentAuditLog(payload = {}) {
  if (!hasPersistentDatabase) return null;

  try {
    return prisma.auditLog.create({
      data: {
        actor: String(payload.actor || "system"),
        action: String(payload.action || "INFO"),
        entity: String(payload.entity || "Suite"),
        entityId: payload.entityId ? String(payload.entityId) : null,
        detail: String(payload.detail || "Activity recorded"),
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined
      }
    });
  } catch (error) {
    console.error("Persistent audit log write failed.", error);
    return null;
  }
}

export async function deletePersistentAuditLog(id) {
  if (!hasPersistentDatabase) return null;

  try {
    await prisma.auditLog.delete({ where: { id } });
    return { id };
  } catch (error) {
    console.error("Persistent audit log delete failed.", error);
    return null;
  }
}

async function deleteLocalUploadedFile(fileUrl) {
  if (!fileUrl?.startsWith("/uploads/")) return;

  const filePath = path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));

  try {
    await unlink(filePath);
  } catch {}
}

async function refreshAtsResourceFromSharePoint(resource) {
  if (!isAtsSharePointResource(resource)) return;

  await maybeImportAtsFromSharePoint(prisma).catch((error) => {
    console.error("SharePoint ATS import failed:", error);
  });
}

function queueAtsResourceExport(resource) {
  if (isAtsSharePointResource(resource)) {
    queueAtsSharePointExport(prisma, resource);
  }
}

export async function getPersistentHrmsData() {
  if (!hasPersistentDatabase) return null;

  try {
    const [employees, leaveRequests, attendanceRecords, vendorWorkers, documents, approvals, settings, punchActivity] = await Promise.all([
      prisma.employee.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.leaveRequest.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.attendanceRecord.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.vendorWorker.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.documentRecord.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.approvalItem.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.companySetting.findMany({ orderBy: { category: "asc" } }),
      prisma.punchActivity.findMany({ orderBy: { timestamp: "desc" } }).catch(() => [])
    ]);

    return { employees, leaveRequests, attendanceRecords, vendorWorkers, documents, approvals, settings, punchActivity };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return null;
    throw error;
  }
}

export async function getPersistentBootstrapMetrics() {
  if (!hasPersistentDatabase) return null;

  const [jobOpenings, candidates, vendors, invoices, employees] = await Promise.all([
    prisma.jobOpening.count().catch(() => 0),
    prisma.candidate.count().catch(() => 0),
    prisma.vendor.count().catch(() => 0),
    prisma.invoice.count({ where: { status: "Approved" } }).catch(() => 0),
    prisma.employee.count().catch(() => 0)
  ]);

  return [
    { label: "Open Requisitions", value: String(jobOpenings), meta: `${candidates} active candidate records` },
    { label: "Employee Master", value: String(employees), meta: "Profiles, bank, grade, and lifecycle" },
    { label: "Active Vendors", value: String(vendors), meta: "Live vendor master" },
    { label: "Approved Invoices", value: String(invoices), meta: "Finance-cleared queue" }
  ];
}
