import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";
import { ApiRouteError } from "@/lib/api-route-factory";

const exporters = {
  employees: {
    fileName: "talme-employees.csv",
    headers: ["Employee ID", "Name", "Department", "Location", "Manager", "Grade", "Salary Band", "Status"],
    map: (item) => [
      item.employeeId,
      item.name,
      item.department,
      item.location,
      item.manager,
      item.grade,
      item.salaryBand,
      item.status
    ],
    load: () => prisma.employee.findMany({ orderBy: { createdAt: "desc" } })
  },
  candidates: {
    fileName: "talme-candidates.csv",
    headers: ["Name", "Role", "Stage", "Source", "Status"],
    map: (item) => [item.name, item.role, item.stage, item.source, item.status],
    load: () => prisma.candidate.findMany({ orderBy: { createdAt: "desc" } })
  },
  vendors: {
    fileName: "talme-vendors.csv",
    headers: ["Vendor", "Category", "Sites", "Rating", "Status"],
    map: (item) => [item.vendor, item.category, item.sites, item.rating, item.status],
    load: () => prisma.vendor.findMany({ orderBy: { createdAt: "desc" } })
  },
  invoices: {
    fileName: "talme-invoices.csv",
    headers: ["Vendor", "Invoice No", "Attendance", "Amount", "Status"],
    map: (item) => [item.vendor, item.invoiceNo, item.attendance, item.amount, item.status],
    load: () => prisma.invoice.findMany({ orderBy: { createdAt: "desc" } })
  },
  documents: {
    fileName: "talme-documents.csv",
    headers: ["Owner", "Document", "Module", "Expiry", "Status"],
    map: (item) => [item.owner, item.docType, item.module, item.expiry, item.status],
    load: () => prisma.documentRecord.findMany({ orderBy: { createdAt: "desc" } })
  },
  approvals: {
    fileName: "talme-approvals.csv",
    headers: ["Module", "Title", "Owner", "Amount", "Level", "Status"],
    map: (item) => [item.module, item.title, item.owner, item.amount, item.level, item.status],
    load: () => prisma.approvalItem.findMany({ orderBy: { createdAt: "desc" } })
  },
  notifications: {
    fileName: "talme-notifications.csv",
    headers: ["Subject", "Audience", "Recipients", "Channel", "Status"],
    map: (item) => [item.subject, item.audience, item.recipients, item.channel, item.status],
    load: () => prisma.notification.findMany({ orderBy: { createdAt: "desc" } })
  }
};

function toCsv(rows) {
  return rows
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export async function buildCsvExport(dataset) {
  await ensureSeedData();

  const config = exporters[dataset];

  if (!config) {
    throw new ApiRouteError("Unknown export dataset.", 404);
  }

  const items = await config.load();
  return {
    fileName: config.fileName,
    csv: toCsv([config.headers, ...items.map(config.map)])
  };
}
