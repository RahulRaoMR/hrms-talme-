import "../lib/load-env.js";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import {
  approvalSeed,
  attendanceSeed,
  documentSeed,
  employeeMasterSeed,
  leaveSeed,
  notificationSeed,
  settingSeed,
  uploadedAssetSeed,
  vendorWorkerSeed
} from "../lib/demo-data.js";

const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//;
const cleanUrl = (value) => String(value || "").trim().replace(/^"|"$/g, "");
const databaseUrl = [
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL_NON_POOLING
]
  .map(cleanUrl)
  .find((value) => POSTGRES_URL_PATTERN.test(value));

if (!databaseUrl) {
  console.error("DATABASE_URL must be a PostgreSQL URL starting with postgresql:// or postgres://.");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });
const now = () => new Date();
const id = () => crypto.randomUUID();
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "talme123";

const candidates = [
  { name: "Neha Sharma", role: "HRBP", stage: "Final Interview", source: "Direct ATS", status: "Pending", tone: "gold" },
  { name: "Arjun Menon", role: "Security Lead", stage: "Offer", source: "Staffing Vendor", status: "Approved", tone: "teal" },
  { name: "Sonal Rao", role: "Payroll Analyst", stage: "Assessment", source: "Referral", status: "Review", tone: "slate" }
];

const vendors = [
  { vendor: "StaffCore India", category: "Staffing", sites: 8, rating: 4.8, status: "Active", tone: "teal" },
  { vendor: "MoveFleet Logistics", category: "Transport", sites: 3, rating: 4.5, status: "Review", tone: "gold" },
  { vendor: "FreshServe Foods", category: "Canteen", sites: 5, rating: 4.6, status: "Active", tone: "teal" },
  { vendor: "SecureAxis Services", category: "Security", sites: 4, rating: 4.7, status: "Active", tone: "teal" }
];

const invoices = [
  { vendor: "StaffCore India", invoiceNo: "INV-4388", attendance: "March closed", amount: "INR 42,40,000", status: "Approved", tone: "teal" },
  { vendor: "SecureAxis Services", invoiceNo: "INV-1293", attendance: "March closed", amount: "INR 18,70,000", status: "Finance Review", tone: "gold" },
  { vendor: "MoveFleet Logistics", invoiceNo: "INV-9902", attendance: "March closed", amount: "INR 9,25,000", status: "Pending Docs", tone: "slate" }
];

try {
  await client.connect();
  await seed();
  console.log("Seeded Talme HRMS database.");
} finally {
  await client.end();
}

async function seed() {
  await upsert(
    "User",
    ["email"],
    {
      id: "seed-admin",
      name: "Talme Director",
      email: "director@talme.ai",
      role: "Enterprise Admin",
      passwordHash: await bcrypt.hash(defaultAdminPassword, 10),
      active: true,
      createdAt: now(),
      updatedAt: now()
    },
    ["role", "passwordHash", "active", "updatedAt"]
  );

  for (const candidate of candidates) {
    await insertIfMissing("Candidate", { name: candidate.name, role: candidate.role }, withTimestamps(candidate));
  }

  for (const vendor of vendors) {
    await insertIfMissing("Vendor", { vendor: vendor.vendor, category: vendor.category }, withTimestamps(vendor));
  }

  for (const invoice of invoices) {
    await upsert("Invoice", ["invoiceNo"], withTimestamps(invoice), []);
  }

  await insert("AuditLog", {
    id: id(),
    actor: "system",
    action: "SEED",
    entity: "Database",
    detail: "Seeded Talme HRMS demo database",
    createdAt: now()
  });

  for (const employee of employeeMasterSeed) {
    await upsert("Employee", ["employeeId"], withTimestamps(employee), []);
  }

  await createManyIfEmpty("LeaveRequest", leaveSeed.map(withTimestamps));
  await createManyIfEmpty("AttendanceRecord", attendanceSeed.map(withTimestamps));

  for (const worker of vendorWorkerSeed) {
    await upsert("VendorWorker", ["workerId"], withTimestamps(worker), []);
  }

  await createManyIfEmpty("DocumentRecord", documentSeed.map(withTimestamps));
  await createManyIfEmpty("ApprovalItem", approvalSeed.map(withTimestamps));
  await createManyIfEmpty("CompanySetting", settingSeed.map(withTimestamps));
  await createManyIfEmpty("UploadedAsset", uploadedAssetSeed.map(withTimestamps));
  await createManyIfEmpty("Notification", notificationSeed.map(withTimestamps));
}

function withTimestamps(row) {
  return {
    id: id(),
    ...row,
    createdAt: now(),
    updatedAt: now()
  };
}

async function createManyIfEmpty(table, rows) {
  if (!rows.length) return;

  const count = await client.query(`SELECT COUNT(*)::int AS count FROM ${quote(table)}`);

  if (count.rows[0]?.count > 0) return;

  for (const row of rows) {
    await insert(table, row);
  }
}

async function insertIfMissing(table, where, row) {
  const clauses = Object.keys(where).map((column, index) => `${quote(column)} = $${index + 1}`);
  const existing = await client.query(`SELECT 1 FROM ${quote(table)} WHERE ${clauses.join(" AND ")} LIMIT 1`, Object.values(where));

  if (!existing.rowCount) {
    await insert(table, row);
  }
}

async function upsert(table, conflictColumns, row, updateColumns) {
  const columns = Object.keys(row);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const updates = updateColumns.map((column) => `${quote(column)} = EXCLUDED.${quote(column)}`);
  const onConflict = updates.length ? `DO UPDATE SET ${updates.join(", ")}` : "DO NOTHING";

  await client.query(
    `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")})
     VALUES (${placeholders.join(", ")})
     ON CONFLICT (${conflictColumns.map(quote).join(", ")}) ${onConflict}`,
    columns.map((column) => row[column])
  );
}

async function insert(table, row) {
  const columns = Object.keys(row);
  const placeholders = columns.map((_, index) => `$${index + 1}`);

  await client.query(
    `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES (${placeholders.join(", ")})`,
    columns.map((column) => row[column])
  );
}

function quote(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}
