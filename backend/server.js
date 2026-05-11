import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!process.env.DATABASE_URL && databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const prisma = new PrismaClient();
const app = express();
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const allowedOrigin = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "*";
const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "talme123";
const defaultHrPassword = process.env.DEFAULT_HR_PASSWORD || "hr123";
const databaseStatus = process.env.DATABASE_URL
  ? `${new URL(process.env.DATABASE_URL).protocol.replace(":", "")} configured`
  : "missing";

const resourceMap = {
  candidates: { model: "candidate", orderBy: { createdAt: "desc" }, fields: ["jobId", "recruiterId", "recruiterName", "name", "role", "stage", "source", "status", "tone", "businessUnit", "domain", "client", "noticePeriod", "email", "phone", "qualification", "yearsOfExperience", "previousCompany", "previousCtc", "location", "preferredLocation", "expectedCtc", "sourceDate", "screeningDate", "screeningNotes", "tech1Date", "tech1Status", "tech1Remarks", "tech1Panel", "tech2Date", "tech2Status", "tech2Remarks", "tech2Panel", "tech3Date", "tech3Status", "tech3Remarks", "tech3Panel", "offerStageInputDate", "documentCollectionDate", "approvalDate", "offerDate", "offerStatus", "offerDecisionDate", "offerAcceptStatus", "joiningDate", "joiningStatus", "offeredCtc"] },
  "job-openings": { model: "jobOpening", orderBy: { postedDate: "desc" }, fields: ["jobId", "agingDays", "hireType", "postedDate", "businessUnit", "department", "client", "domain", "position", "priority", "numberOfOpenings", "status", "remarks", "candidateConcerned", "holdDate", "offerStageDate", "offerDate", "joiningDate", "candidateCtc", "source", "harmonizedRole", "recruiterTagged", "originalJobPostDate", "tone"] },
  recruiters: { model: "recruiter", orderBy: { recruiterId: "asc" }, fields: ["recruiterId", "name", "email", "phoneNumber", "currentStatus", "joinedDate", "lwd", "designation"] },
  "harmonized-roles": { model: "harmonizedRole", orderBy: { position: "asc" }, fields: ["position", "harmonizedRole"] },
  vendors: { model: "vendor", orderBy: { createdAt: "desc" }, fields: ["vendor", "category", "sites", "rating", "status", "tone"] },
  invoices: { model: "invoice", orderBy: { createdAt: "desc" }, fields: ["vendor", "invoiceNo", "attendance", "amount", "status", "tone"] },
  users: { model: "user", orderBy: { createdAt: "desc" }, fields: ["name", "email", "role", "active"] },
  employees: { model: "employee", orderBy: { createdAt: "desc" }, fields: ["employeeId", "email", "name", "department", "location", "manager", "grade", "joiningDate", "salaryBand", "salaryNetPay", "bankStatus", "status", "tone", "employeeDetails"] },
  "leave-requests": { model: "leaveRequest", orderBy: { createdAt: "desc" }, fields: ["employee", "leaveType", "dates", "balance", "approver", "status", "tone"] },
  "attendance-records": { model: "attendanceRecord", orderBy: { createdAt: "desc" }, fields: ["employee", "salaryNetPay", "month", "monthDays", "sundays", "holidays", "paidLeaves", "otHours", "present", "leaves", "overtime", "shift", "lockState", "tone"] },
  "vendor-workers": { model: "vendorWorker", orderBy: { createdAt: "desc" }, fields: ["workerId", "name", "vendor", "site", "skill", "wageRate", "attendance", "status", "tone"] },
  documents: { model: "documentRecord", orderBy: { createdAt: "desc" }, fields: ["owner", "docType", "module", "expiry", "status", "tone"] },
  approvals: { model: "approvalItem", orderBy: { createdAt: "desc" }, fields: ["module", "title", "owner", "amount", "level", "status", "tone"] },
  settings: { model: "companySetting", orderBy: { category: "asc" }, fields: ["category", "name", "value", "status"] },
  uploads: { model: "uploadedAsset", orderBy: { createdAt: "desc" }, fields: ["module", "owner", "label", "fileName", "fileUrl", "mimeType", "sizeLabel", "status"] },
  notifications: { model: "notification", orderBy: { createdAt: "desc" }, fields: ["subject", "audience", "recipients", "channel", "message", "status", "tone", "providerResult", "providerError"] }
};

app.use(cors({ origin: allowedOrigin, credentials: allowedOrigin !== "*" }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

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
      expectedRole === "Employee" || !identifier.includes("@")
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

app.all("/api/pdf/:kind", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ kind: req.params.kind, message: "PDF endpoint is available on the Express backend." });
});

app.get("/api/:resource", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  const rows = await prisma[config.model].findMany({ orderBy: config.orderBy });
  res.json(rows);
}));

app.post("/api/:resource", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  const data = pick(req.body, config.fields);
  const row = await prisma[config.model].create({ data });
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
  const row = await prisma[config.model].update({
    where: { id: req.params.id },
    data: pick(req.body, config.fields)
  });
  res.json(row);
}));

app.delete("/api/:resource/:id", asyncHandler(async (req, res) => {
  const config = resourceMap[req.params.resource];
  if (!config) return res.status(404).json({ error: "Unknown API resource." });
  await prisma[config.model].delete({ where: { id: req.params.id } });
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

function pick(payload, fields) {
  return fields.reduce((data, field) => {
    if (payload?.[field] !== undefined) {
      data[field] = payload[field];
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
    employee: "Employee"
  };

  return roles[role] || role || "";
}

function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
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
