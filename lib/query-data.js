import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

const PAGE_SIZE = 5;

export async function getDashboardMetrics() {
  await ensureSeedData();

  const [candidateCount, vendorCount, approvedInvoiceCount] = await Promise.all([
    prisma.candidate.count(),
    prisma.vendor.count(),
    prisma.invoice.count({
      where: {
        status: "Approved"
      }
    })
  ]);

  return [
    { label: "Open Requisitions", value: String(candidateCount * 12), meta: `${candidateCount} active candidate records` },
    { label: "Active Vendors", value: String(vendorCount), meta: "Live vendor master" },
    { label: "Attendance Accuracy", value: "99.2%", meta: "Monthly sheet locked" },
    { label: "Approved Invoices", value: String(approvedInvoiceCount), meta: "Finance-cleared queue" }
  ];
}

export async function getCandidates({ query = "", source = "All", page = 1 }) {
  await ensureSeedData();

  const where = {
    AND: [
      query
        ? {
            OR: [
              { name: { contains: query } },
              { role: { contains: query } },
              { stage: { contains: query } }
            ]
          }
        : {},
      source !== "All" ? { source } : {}
    ]
  };

  const [items, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.candidate.count({ where })
  ]);

  return { items, total, page, pageSize: PAGE_SIZE };
}

export async function getVendors({ query = "", category = "All", page = 1 }) {
  await ensureSeedData();

  const where = {
    AND: [
      query
        ? {
            OR: [
              { vendor: { contains: query } },
              { category: { contains: query } }
            ]
          }
        : {},
      category !== "All" ? { category } : {}
    ]
  };

  const [items, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.vendor.count({ where })
  ]);

  return { items, total, page, pageSize: PAGE_SIZE };
}

export async function getInvoices({ query = "", status = "All", page = 1 }) {
  await ensureSeedData();

  const where = {
    AND: [
      query
        ? {
            OR: [
              { vendor: { contains: query } },
              { invoiceNo: { contains: query } },
              { amount: { contains: query } }
            ]
          }
        : {},
      status !== "All" ? { status } : {}
    ]
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.invoice.count({ where })
  ]);

  return { items, total, page, pageSize: PAGE_SIZE };
}
