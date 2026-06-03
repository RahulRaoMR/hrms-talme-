import "./lib/load-env.js";
import crypto, { randomBytes } from "node:crypto";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import pool from "./config/db.js";
import { isEmailConfigured, sendEmail } from "./services/emailService.js";
import {
  exportAtsToSharePoint,
  getAtsSharePointSyncStatus,
  isAtsSharePointResource,
  maybeImportAtsFromSharePoint,
  queueAtsSharePointExport
} from "./lib/ats-sharepoint-sync.js";

const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//;
const cleanUrl = (value) => String(value || "").trim().replace(/^"|"$/g, "");
const databaseUrl =
  [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING
  ]
    .map(cleanUrl)
    .find((value) => POSTGRES_URL_PATTERN.test(value)) || "";

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy" })
});
const app = express();
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const configuredFrontendOrigins = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_FRONTEND_URL,
  "https://hrms.talme.in",
  "https://www.hrms.talme.in",
  "http://localhost:3000",
  "http://localhost:3001"
]
  .flatMap((value) => String(value || "").split(","))
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);
const allowedOrigins = new Set(configuredFrontendOrigins);
const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "talme123";
const defaultHrPassword = process.env.DEFAULT_HR_PASSWORD || "hr123";
const databaseStatus = databaseUrl ? `${new URL(databaseUrl).protocol.replace(":", "")} configured` : "missing";

const resourceMap = {
  candidates: { model: "candidate", orderBy: { createdAt: "desc" }, fields: ["jobId", "recruiterId", "recruiterName", "name", "role", "stage", "source", "status", "tone", "businessUnit", "domain", "client", "noticePeriod", "email", "phone", "qualification", "yearsOfExperience", "previousCompany", "previousCtc", "location", "preferredLocation", "expectedCtc", "sourceDate", "screeningDate", "screeningNotes", "tech1Date", "tech1Status", "tech1Remarks", "tech1Panel", "tech2Date", "tech2Status", "tech2Remarks", "tech2Panel", "tech3Date", "tech3Status", "tech3Remarks", "tech3Panel", "offerStageInputDate", "documentCollectionDate", "approvalDate", "offerDate", "offerStatus", "offerDecisionDate", "offerAcceptStatus", "joiningDate", "joiningStatus", "offeredCtc", "resumeFileName", "resumeMimeType", "resumeDataUrl"] },
  "job-openings": { model: "jobOpening", orderBy: { postedDate: "desc" }, fields: ["jobId", "agingDays", "hireType", "postedDate", "businessUnit", "department", "client", "domain", "position", "priority", "numberOfOpenings", "status", "remarks", "candidateConcerned", "holdDate", "offerStageDate", "offerDate", "joiningDate", "candidateCtc", "source", "harmonizedRole", "recruiterTagged", "originalJobPostDate", "tone"] },
  recruiters: { model: "recruiter", orderBy: { recruiterId: "asc" }, fields: ["recruiterId", "name", "email", "phoneNumber", "currentStatus", "joinedDate", "lwd", "designation"] },
  "harmonized-roles": { model: "harmonizedRole", orderBy: { position: "asc" }, fields: ["position", "harmonizedRole"] },
  vendors: { model: "vendor", orderBy: { createdAt: "desc" }, fields: ["vendor", "category", "sites", "rating", "status", "tone"] },
  invoices: { model: "invoice", orderBy: { createdAt: "desc" }, fields: ["vendor", "invoiceNo", "attendance", "amount", "status", "tone"] },
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

app.use(cors({
  origin(origin, callback) {
    if (!origin || !allowedOrigins.size || allowedOrigins.has(origin.replace(/\/$/, ""))) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", asyncHandler(async (_req, res) => {
  const result = await pool.query("SELECT NOW()");

  res.json({
    message: "Talme HRMS Backend Running",
    database: "connected",
    time: result.rows[0]
  });
}));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "HRMS Backend" });
});

app.get("/api/test", (_req, res) => {
  res.json({ message: "API working" });
});

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const identifier = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "").trim();
  const expectedRole = normalizeLoginRole(req.body?.role);

  if (!identifier || !password) {
    return res.status(400).json({ error: "Email or employee ID and password are required." });
  }

  if (["Employee", "Employee HRMS"].includes(expectedRole) && identifier.includes("@")) {
    return res.status(400).json({ error: "Employee login requires Employee ID, not email." });
  }

  if (!databaseUrl) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Login database is not configured." });
    }

    const fallbackUser = getFallbackLoginUser(identifier, password, expectedRole);

    if (!fallbackUser) {
      return res.status(401).json({ error: "Invalid email, role, or password." });
    }

    return res.json({
      token: createSessionToken(fallbackUser),
      user: fallbackUser
    });
  }

  let employee = null;
  let user = null;

  try {
    employee =
      ["Employee", "Employee HRMS"].includes(expectedRole) || !identifier.includes("@")
        ? await prisma.employee.findFirst({
            where: {
              employeeId: {
                equals: identifier,
                mode: "insensitive"
              }
            },
            select: { id: true, employeeId: true, email: true, name: true }
          })
        : null;
    const loginEmail = String(employee?.email || identifier).trim().toLowerCase();

    user = await prisma.user.findUnique({
      where: { email: loginEmail }
    });
  } catch (loginError) {
    if (process.env.NODE_ENV !== "production" && loginError?.code === "EPERM") {
      const fallbackUser = getFallbackLoginUser(identifier, password, expectedRole);

      if (fallbackUser) {
        return res.json({
          token: createSessionToken(fallbackUser),
          user: fallbackUser
        });
      }

      return res.status(401).json({ error: "Invalid email, role, or password." });
    }

    throw loginError;
  }

  if (!user || !user.active || (expectedRole && user.role !== expectedRole)) {
    return res.status(401).json({ error: "Invalid email, role, or password." });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email, role, or password." });
  }

  const sessionUser = {
    id: user.id,
    name: employee?.name || user.name,
    email: user.email,
    role: user.role,
    employeeId: employee?.employeeId || null
  };

  res.json({
    token: createSessionToken(sessionUser),
    user: sessionUser
  });
}));

app.get("/api/auth/session", (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const user = verifySessionToken(token);

  if (!user) {
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }

  res.json({ user });
});

app.get(["/api/bootstrap", "/api/dashboard"], asyncHandler(async (_req, res) => {
  const [jobOpenings, candidates, vendors, invoices, employees] = await Promise.all([
    prisma.jobOpening.count().catch(() => 0),
    prisma.candidate.count().catch(() => 0),
    prisma.vendor.count().catch(() => 0),
    prisma.invoice.count({ where: { status: "Approved" } }).catch(() => 0),
    prisma.employee.count().catch(() => 0)
  ]);

  res.json({
    metrics: [
      { label: "Open Requisitions", value: String(jobOpenings), meta: `${candidates} active candidate records` },
      { label: "Employee Master", value: String(employees), meta: "Profiles, bank, grade, and lifecycle" },
      { label: "Active Vendors", value: String(vendors), meta: "Live vendor master" },
      { label: "Approved Invoices", value: String(invoices), meta: "Finance-cleared queue" }
    ]
  });
}));

app.get("/api/hrms", asyncHandler(async (_req, res) => {
  res.json(await getSuiteData());
}));

app.get("/api/ats/sharepoint-sync", (_req, res) => {
  res.json(getAtsSharePointSyncStatus());
});

app.post("/api/ats/sharepoint-sync", asyncHandler(async (req, res) => {
  const action = String(req.body?.action || "import").trim().toLowerCase();

  if (action === "export") {
    return res.json(await exportAtsToSharePoint(prisma));
  }

  return res.json(await maybeImportAtsFromSharePoint(prisma, { force: true }));
}));

app.post("/api/ats/sharepoint-sync/import", asyncHandler(async (_req, res) => {
  res.json(await maybeImportAtsFromSharePoint(prisma, { force: true }));
}));

app.post("/api/ats/sharepoint-sync/export", asyncHandler(async (_req, res) => {
  res.json(await exportAtsToSharePoint(prisma));
}));

app.get("/api/punch-activity", asyncHandler(async (req, res) => {
  const employeeId = String(req.query.employeeId || "").trim();
  const workDate = String(req.query.date || req.query.workDate || "").trim();
  const month = String(req.query.month || "").trim();
  const where = {};

  if (employeeId) {
    where.employeeId = { equals: employeeId, mode: "insensitive" };
  }

  if (workDate) {
    where.workDate = workDate;
  } else if (/^\d{4}-\d{2}$/.test(month)) {
    where.workDate = { startsWith: month };
  }

  const rows = await prisma.punchActivity.findMany({
    where,
    orderBy: { timestamp: "desc" }
  });

  res.json(rows);
}));

app.post("/api/punch-activity", asyncHandler(async (req, res) => {
  const timestamp = new Date(req.body?.timestamp || Date.now());
  const employeeId = String(req.body?.employeeId || "").trim();
  const type = String(req.body?.type || "").trim();

  if (!employeeId) {
    return res.status(400).json({ error: "Employee ID is required." });
  }

  if (!["Punch In", "Punch Out"].includes(type)) {
    return res.status(400).json({ error: "Punch type must be Punch In or Punch Out." });
  }

  if (Number.isNaN(timestamp.getTime())) {
    return res.status(400).json({ error: "Punch timestamp is invalid." });
  }

  const data = {
    employeeId,
    employeeName: req.body?.employeeName ? String(req.body.employeeName).trim() : null,
    type,
    timestamp,
    time: String(req.body?.time || "").trim() || formatPunchTime(timestamp),
    workDate: String(req.body?.workDate || "").trim() || formatStorageDate(timestamp),
    geoCoordinates: req.body?.geoCoordinates || undefined
  };
  const existing = await prisma.punchActivity.findFirst({
    where: {
      employeeId: { equals: data.employeeId, mode: "insensitive" },
      type: data.type,
      timestamp
    }
  });

  if (existing) {
    return res.json(existing);
  }

  const row = await prisma.punchActivity.create({
    data
  });

  res.status(201).json(row);
}));

app.get("/api/employee-portal", asyncHandler(async (_req, res) => {
  const data = await getSuiteData();
  res.json({
    employees: data.employees,
    leaveRequests: data.leaveRequests,
    attendanceRecords: data.attendanceRecords,
    documents: data.documents.filter((item) => item.module === "Employee"),
    assets: await prisma.uploadedAsset.findMany({ where: { module: "Employee" }, orderBy: { createdAt: "desc" } })
  });
}));

app.get("/api/vendor-portal", asyncHandler(async (_req, res) => {
  const [vendors, workers, invoices] = await Promise.all([
    prisma.vendor.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.vendorWorker.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" } })
  ]);
  res.json({ vendors, workers, invoices });
}));

app.get("/api/reports", asyncHandler(async (_req, res) => {
  const data = await getSuiteData();
  res.json({
    scorecards: [
      { label: "Employees", value: String(data.employees.length), meta: "Master profiles live" },
      { label: "Pending Leave", value: String(data.leaveRequests.length), meta: "Manager action needed" },
      { label: "Attendance Exceptions", value: String(data.attendanceRecords.length), meta: "T&A review queue" },
      { label: "Vendor Workers", value: String(data.vendorWorkers.length), meta: "Deployed manpower" }
    ],
    aiSignals: ["Backend is connected through Express and Prisma."],
    charts: { departments: [], sourcing: [], invoices: [] }
  });
}));

app.get("/api/search", asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    res.json({ employees: [], candidates: [], vendors: [], invoices: [], documents: [], approvals: [] });
    return;
  }

  const contains = { contains: q, mode: "insensitive" };
  const [employees, candidates, vendors, invoices, documents, approvals] = await Promise.all([
    prisma.employee.findMany({ where: { OR: [{ name: contains }, { employeeId: contains }, { department: contains }] }, take: 8 }),
    prisma.candidate.findMany({ where: { OR: [{ name: contains }, { role: contains }, { source: contains }] }, take: 8 }),
    prisma.vendor.findMany({ where: { OR: [{ vendor: contains }, { category: contains }] }, take: 8 }),
    prisma.invoice.findMany({ where: { OR: [{ vendor: contains }, { invoiceNo: contains }, { amount: contains }] }, take: 8 }),
    prisma.documentRecord.findMany({ where: { OR: [{ owner: contains }, { docType: contains }, { module: contains }] }, take: 8 }),
    prisma.approvalItem.findMany({ where: { OR: [{ title: contains }, { owner: contains }, { module: contains }] }, take: 8 })
  ]);

  res.json({ employees, candidates, vendors, invoices, documents, approvals });
}));

app.get("/api/export/:dataset", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.dataset];
  if (!config) return res.status(404).json({ error: "Unknown export dataset." });
  const rows = await prisma[config.model].findMany({ orderBy: config.orderBy });
  const headers = config.fields;
  const csv = [headers, ...rows.map((row) => headers.map((field) => row[field] ?? ""))]
    .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.dataset}.csv"`);
  res.send(csv);
}));

app.post("/api/notifications/:id/send", asyncHandler(async (req, res) => {
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { status: "Sent", providerResult: "Marked sent by Express backend", providerError: null }
  });
  res.json(notification);
}));

app.post("/api/payroll/release", (_req, res) => {
  res.json({ released: true, message: "Payroll release accepted." });
});

app.get("/api/users", asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" }
  });

  res.json(users.map(safeUser));
}));

app.post("/api/users", asyncHandler(async (req, res) => {
  const password = String(req.body?.password || "").trim();

  if (!password) {
    return res.status(400).json({ error: "Password is required to create a user." });
  }

  const user = await prisma.user.create({
    data: {
      name: String(req.body?.name || "").trim(),
      email: String(req.body?.email || "").trim().toLowerCase(),
      role: String(req.body?.role || "HR").trim(),
      active: req.body?.active !== false,
      passwordHash: await bcrypt.hash(password, 10)
    }
  });

  res.status(201).json(safeUser(user));
}));

app.patch("/api/users/:id", asyncHandler(async (req, res) => {
  const data = {
    name: String(req.body?.name || "").trim(),
    email: String(req.body?.email || "").trim().toLowerCase(),
    role: String(req.body?.role || "HR").trim(),
    active: req.body?.active !== false
  };
  const password = String(req.body?.password || "").trim();

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data
  });

  res.json(safeUser(user));
}));

app.delete("/api/users/:id", asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ id: req.params.id });
}));

app.get("/api/employees", asyncHandler(async (_req, res) => {
  const rows = await prisma.employee.findMany({ orderBy: resourceMap.employees.orderBy });
  res.json(rows);
}));

app.post("/api/employees", asyncHandler(async (req, res) => {
  const data = pick(req.body, resourceMap.employees.fields, resourceMap.employees);
  const row = await prisma.employee.create({ data });
  const onboarding = await onboardEmployee(row);
  res.status(201).json({ ...row, onboarding });
}));

app.all("/api/pdf/:kind", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ kind: req.params.kind, message: "PDF endpoint is available on the Express backend." });
});

app.get("/api/:resource", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  await refreshAtsResourceFromSharePoint(req.params.resource);
  const rows = await prisma[config.model].findMany({ orderBy: config.orderBy });
  res.json(rows);
}));

app.post("/api/:resource", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  const data = pick(req.body, config.fields, config);
  const row = await prisma[config.model].create({ data });
  queueAtsResourceExport(req.params.resource);
  res.status(201).json(row);
}));

app.get("/api/:resource/:id", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  const row = await prisma[config.model].findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: "Record not found." });
  res.json(row);
}));

app.patch("/api/:resource/:id", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  const previousRow = req.params.resource === "leave-requests"
    ? await prisma[config.model].findUnique({ where: { id: req.params.id } })
    : null;
  const row = await prisma[config.model].update({
    where: { id: req.params.id },
    data: pick(req.body, config.fields, config)
  });
  queueAtsResourceExport(req.params.resource);
  const leaveNotification = await sendLeaveStatusNotification(req.params.resource, previousRow, row);
  res.json(leaveNotification ? { ...row, leaveNotification } : row);
}));

app.delete("/api/:resource/:id", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  await prisma[config.model].delete({ where: { id: req.params.id } });
  queueAtsResourceExport(req.params.resource);
  res.json({ id: req.params.id });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || "Internal server error." });
});

app.listen(port, hostname, () => {
  console.log(`PORT: ${process.env.PORT || port}`);
  console.log(`DATABASE_URL status: ${databaseStatus}`);
  console.log(`HRMS backend running on ${hostname}:${port}`);
});

async function getSuiteData() {
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

function getModelFieldMap(modelName) {
  const model = Prisma.dmmf.datamodel.models.find((item) => item.name.toLowerCase() === modelName.toLowerCase());
  return new Map(model?.fields.map((field) => [field.name, field]) || []);
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

function formatStorageDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPunchTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date).toLowerCase();
}

function pick(payload, fields, config) {
  const fieldMap = config ? getModelFieldMap(config.model) : new Map();

  return fields.reduce((data, field) => {
    if (payload?.[field] !== undefined) {
      data[field] = coerceFieldValue(payload[field], fieldMap.get(field));
    }
    return data;
  }, {});
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function normalizeLoginRole(role) {
  const roles = {
    admin: "Enterprise Admin",
    hr: "HR",
    employeeHrms: "Employee HRMS",
    payroll: "Payroll",
    employee: "Employee"
  };

  return roles[role] || role || "";
}

function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmailShell(title, content) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <div style="border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f766e, #1d4ed8); color: #ffffff; padding: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Talme HRMS</p>
          <h2 style="margin: 0; font-size: 28px;">${escapeHtml(title)}</h2>
        </div>
        <div style="padding: 24px;">
          ${content}
        </div>
      </div>
    </div>
  `;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${escapeHtml(label)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${escapeHtml(value || "-")}</td>
    </tr>
  `;
}

function generateEmployeePassword() {
  return `Talme@${randomBytes(4).toString("hex")}`;
}

function getEmployeeLoginEmail(employee) {
  return String(employee?.email || "").trim().toLowerCase();
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

function getEmployeeAppLoginUrl() {
  return `${getFrontendBaseUrl()}/employee-app/login`;
}

function buildWelcomeEmail(employee, password) {
  const loginUrl = getEmployeeAppLoginUrl();

  return renderEmailShell(
    "Welcome to Talme",
    `
      <p>Hi ${escapeHtml(employee?.name || "Team Member")},</p>
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
    `
  );
}

async function createEmployeePortalAccount(employee, password) {
  const loginEmail = getEmployeeLoginEmail(employee);

  if (!loginEmail) {
    return { created: false, reason: "Missing employee email." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: loginEmail },
    update: {
      name: employee.name,
      role: "Employee",
      active: true,
      passwordHash
    },
    create: {
      name: employee.name,
      email: loginEmail,
      role: "Employee",
      active: true,
      passwordHash
    }
  });

  return { created: true };
}

async function onboardEmployee(employee) {
  const loginEmail = getEmployeeLoginEmail(employee);

  if (!loginEmail) {
    return { accountCreated: false, emailSent: false, reason: "Missing employee email." };
  }

  const password = generateEmployeePassword();
  const account = await createEmployeePortalAccount(employee, password);

  if (!account.created) {
    return { accountCreated: false, emailSent: false, reason: account.reason };
  }

  if (!isEmailConfigured()) {
    return { accountCreated: true, emailSent: false, reason: "Email service is not configured." };
  }

  try {
    const loginUrl = getEmployeeAppLoginUrl();
    const info = await sendEmail(loginEmail, "Welcome to Talme", buildWelcomeEmail(employee, password), {
      text: `Hi ${employee?.name || "Team Member"}, your employee account has been created successfully. Login page: ${loginUrl}. Employee ID: ${employee?.employeeId || "-"}. Temporary password: ${password}.`
    });

    return {
      accountCreated: true,
      emailSent: true,
      reason: info?.messageId || info?.response || "Email delivered."
    };
  } catch (error) {
    console.error("Employee welcome email failed:", error);
    return {
      accountCreated: true,
      emailSent: false,
      reason: error?.message || "Email delivery failed."
    };
  }
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getLeaveEmailStatus(status) {
  const normalizedStatus = normalizeText(status);
  return ["accepted", "approved", "leave accepted"].includes(normalizedStatus) ? "Accepted" : status || "Updated";
}

async function findEmployeeForLeave(leaveRequest) {
  const lookup = String(leaveRequest?.employee || "").trim();

  if (!lookup) {
    return null;
  }

  return prisma.employee.findFirst({
    where: {
      OR: [
        { employeeId: { equals: lookup, mode: "insensitive" } },
        { name: { equals: lookup, mode: "insensitive" } },
        { email: { equals: lookup, mode: "insensitive" } }
      ]
    }
  });
}

function buildLeaveStatusEmail(employee, leaveRequest) {
  const emailStatus = getLeaveEmailStatus(leaveRequest?.status);

  return renderEmailShell(
    `Leave ${emailStatus}`,
    `
      <p>Hi ${escapeHtml(employee?.name || leaveRequest?.employee || "Employee")},</p>
      <p>Your leave request has been <strong>${escapeHtml(emailStatus)}</strong>.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <tbody>
          ${detailRow("Leave Type", leaveRequest?.leaveType)}
          ${detailRow("Dates", leaveRequest?.dates)}
          ${detailRow("Reason", leaveRequest?.reason || "No reason provided")}
          ${detailRow("Status", emailStatus)}
        </tbody>
      </table>

      <p>Please log in to the Talme employee app if you want to review the full request details.</p>
    `
  );
}

async function sendLeaveStatusNotification(resource, previousLeave, nextLeave) {
  if (resource !== "leave-requests" || !nextLeave?.status) {
    return null;
  }

  if (normalizeText(previousLeave?.status) === normalizeText(nextLeave.status)) {
    return { sent: false, skipped: true, reason: "Leave status did not change." };
  }

  const employee = await findEmployeeForLeave(nextLeave);

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

function getFallbackLoginUser(identifier, password, expectedRole) {
  const normalizedIdentifier = identifier.toLowerCase();
  const fallbackUsers = [
    {
      id: "fallback-admin",
      name: "Talme Director",
      email: "director@talme.ai",
      role: "Enterprise Admin",
      password: defaultAdminPassword,
      employeeId: null
    },
    {
      id: "fallback-hr",
      name: "Talme HR",
      email: "hr@talme.ai",
      role: "HR",
      password: defaultHrPassword,
      employeeId: null
    }
  ];
  const user = fallbackUsers.find(
    (entry) =>
      entry.email === normalizedIdentifier &&
      entry.password === password &&
      (!expectedRole || entry.role === expectedRole)
  );

  if (!user) return null;

  const { password: _password, ...safe } = user;
  return safe;
}

function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      user,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000
    })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature) return null;

  const expectedSignature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    if (!session?.user?.email || Date.now() > Number(session.expiresAt || 0)) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}
