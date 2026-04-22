import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

const PAGE_SIZE = 5;

export async function getDashboardMetrics() {
  await ensureSeedData();

  const [candidateCount, vendorCount, approvedInvoiceCount, employeeCount] = await Promise.all([
    prisma.candidate.count(),
    prisma.vendor.count(),
    prisma.invoice.count({
      where: {
        status: "Approved"
      }
    }),
    prisma.employee.count()
  ]);

  return [
    { label: "Open Requisitions", value: String(candidateCount * 12), meta: `${candidateCount} active candidate records` },
    { label: "Employee Master", value: String(employeeCount), meta: "Profiles, bank, grade, and lifecycle" },
    { label: "Active Vendors", value: String(vendorCount), meta: "Live vendor master" },
    { label: "Approved Invoices", value: String(approvedInvoiceCount), meta: "Finance-cleared queue" }
  ];
}

export async function getEnterpriseSuiteData() {
  await ensureSeedData();

  const [
    employees,
    leaveRequests,
    attendanceRecords,
    vendorWorkers,
    documents,
    approvals,
    settings
  ] = await Promise.all([
    prisma.employee.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.leaveRequest.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.attendanceRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.vendorWorker.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.documentRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.approvalItem.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.companySetting.findMany({ orderBy: { category: "asc" } })
  ]);

  return {
    employees,
    leaveRequests,
    attendanceRecords,
    vendorWorkers,
    documents,
    approvals,
    settings
  };
}

export async function getApprovalItems() {
  await ensureSeedData();

  return prisma.approvalItem.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getDocumentRecords() {
  await ensureSeedData();

  return prisma.documentRecord.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getCompanySettings() {
  await ensureSeedData();

  return prisma.companySetting.findMany({ orderBy: { category: "asc" } });
}

export async function getVendorWorkers() {
  await ensureSeedData();

  return prisma.vendorWorker.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getEmployeePortalData() {
  await ensureSeedData();

  const [employees, leaveRequests, attendanceRecords, documents] = await Promise.all([
    prisma.employee.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.leaveRequest.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.attendanceRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.documentRecord.findMany({
      where: { module: "Employee" },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return { employees, leaveRequests, attendanceRecords, documents };
}

export async function getReportData() {
  await ensureSeedData();

  const [
    employeeCount,
    leavePending,
    attendanceReview,
    vendorWorkerCount,
    documentRisk,
    approvalPending,
    candidateCount,
    vendorCount,
    invoiceReview
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.leaveRequest.count({ where: { status: { contains: "Review" } } }),
    prisma.attendanceRecord.count({ where: { lockState: { contains: "Review" } } }),
    prisma.vendorWorker.count(),
    prisma.documentRecord.count({ where: { status: { not: "Verified" } } }),
    prisma.approvalItem.count({ where: { status: { not: "Approved" } } }),
    prisma.candidate.count(),
    prisma.vendor.count(),
    prisma.invoice.count({
      where: {
        OR: [{ status: "Finance Review" }, { status: "Pending Docs" }]
      }
    })
  ]);

  return {
    scorecards: [
      { label: "Employees", value: String(employeeCount), meta: "Master profiles live" },
      { label: "Pending Leave", value: String(leavePending), meta: "Manager action needed" },
      { label: "Attendance Exceptions", value: String(attendanceReview), meta: "T&A review queue" },
      { label: "Vendor Workers", value: String(vendorWorkerCount), meta: "Deployed manpower" },
      { label: "Document Risks", value: String(documentRisk), meta: "KYC/compliance attention" },
      { label: "Open Approvals", value: String(approvalPending), meta: "Cross-module inbox" }
    ],
    aiSignals: [
      `${candidateCount} ATS records indicate stable hiring demand.`,
      `${vendorCount} vendors support staffing, transport, food, security, and facility operations.`,
      `${invoiceReview} payroll/vendor invoices should be cleared before salary payment release.`
    ]
  };
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
