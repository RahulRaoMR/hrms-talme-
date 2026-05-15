import { Prisma, PrismaClient } from "@prisma/client";

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
  vendors: { model: "vendor", orderBy: { createdAt: "desc" }, fields: ["vendor", "category", "sites", "rating", "status", "tone"] },
  invoices: { model: "invoice", orderBy: { createdAt: "desc" }, fields: ["vendor", "invoiceNo", "attendance", "amount", "status", "tone"] },
  users: { model: "user", orderBy: { createdAt: "desc" }, fields: ["name", "email", "role", "active"] },
  employees: { model: "employee", orderBy: { createdAt: "desc" }, fields: ["employeeId", "email", "name", "department", "location", "manager", "grade", "joiningDate", "salaryBand", "salaryNetPay", "bankStatus", "status", "tone", "employeeDetails"] },
  "leave-requests": { model: "leaveRequest", orderBy: { createdAt: "desc" }, fields: ["employee", "leaveType", "dates", "balance", "reason", "approver", "status", "tone"] },
  "attendance-records": { model: "attendanceRecord", orderBy: { createdAt: "desc" }, fields: ["employee", "salaryNetPay", "month", "monthDays", "sundays", "holidays", "paidLeaves", "otHours", "present", "leaves", "overtime", "shift", "lockState", "tone"] },
  "vendor-workers": { model: "vendorWorker", orderBy: { createdAt: "desc" }, fields: ["workerId", "name", "vendor", "site", "skill", "wageRate", "attendance", "status", "tone"] },
  documents: { model: "documentRecord", orderBy: { createdAt: "desc" }, fields: ["owner", "docType", "module", "expiry", "status", "tone"] },
  approvals: { model: "approvalItem", orderBy: { createdAt: "desc" }, fields: ["module", "title", "owner", "amount", "level", "status", "tone"] },
  settings: { model: "companySetting", orderBy: { category: "asc" }, fields: ["category", "name", "value", "status"] },
  uploads: { model: "uploadedAsset", orderBy: { createdAt: "desc" }, fields: ["module", "owner", "label", "fileName", "fileUrl", "mimeType", "sizeLabel", "status"] },
  notifications: { model: "notification", orderBy: { createdAt: "desc" }, fields: ["subject", "audience", "recipients", "channel", "message", "status", "tone", "providerResult", "providerError"] }
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

function pick(payload, fields) {
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

function safeRow(resource, row) {
  if (resource !== "users" || !row) return row;

  const { passwordHash: _passwordHash, ...safe } = row;
  return safe;
}

export async function listPersistentResource(resource) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  const rows = await getModel(config).findMany({ orderBy: config.orderBy });
  return rows.map((row) => safeRow(resource, row));
}

export async function createPersistentResource(resource, payload) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  const row = await getModel(config).create({
    data: pickGeneratedFields(payload, config)
  });

  return safeRow(resource, row);
}

export async function getPersistentResource(resource, id) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  const row = await getModel(config).findUnique({ where: { id } });
  return safeRow(resource, row);
}

export async function updatePersistentResource(resource, id, payload) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  const row = await getModel(config).update({
    where: { id },
    data: pickGeneratedFields(payload, config)
  });

  return safeRow(resource, row);
}

export async function deletePersistentResource(resource, id) {
  if (!hasPersistentDatabase) return null;

  const config = getConfig(resource);
  if (!config) return undefined;

  await getModel(config).delete({ where: { id } });
  return { id };
}

export async function getPersistentHrmsData() {
  if (!hasPersistentDatabase) return null;

  const [employees, leaveRequests, attendanceRecords, vendorWorkers, documents, approvals, settings] = await Promise.all([
    prisma.employee.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.leaveRequest.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.attendanceRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.vendorWorker.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.documentRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.approvalItem.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.companySetting.findMany({ orderBy: { category: "asc" } })
  ]);

  return { employees, leaveRequests, attendanceRecords, vendorWorkers, documents, approvals, settings };
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
