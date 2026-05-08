import "dotenv/config";
import express from "express";
import cors from "cors";
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
  users: { model: "user", orderBy: { createdAt: "desc" }, fields: ["name", "email", "role", "passwordHash", "active"] },
  employees: { model: "employee", orderBy: { createdAt: "desc" }, fields: ["employeeId", "email", "name", "department", "location", "manager", "grade", "joiningDate", "salaryBand", "salaryNetPay", "bankStatus", "status", "tone"] },
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
