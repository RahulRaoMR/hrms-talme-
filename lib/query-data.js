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

export async function getUploadedAssets({ module = "All" } = {}) {
  await ensureSeedData();

  return prisma.uploadedAsset.findMany({
    where: module === "All" ? {} : { module },
    orderBy: { createdAt: "desc" }
  });
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

  const [employees, leaveRequests, attendanceRecords, documents, assets] = await Promise.all([
    prisma.employee.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.leaveRequest.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.attendanceRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.documentRecord.findMany({
      where: { module: "Employee" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.uploadedAsset.findMany({
      where: { module: "Employee" },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return { employees, leaveRequests, attendanceRecords, documents, assets };
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
    invoiceReview,
    notificationsSent,
    employeeGroups,
    candidateSourceGroups,
    invoiceStatusGroups
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
    }),
    prisma.notification.count({ where: { status: "Sent" } }),
    prisma.employee.groupBy({
      by: ["department"],
      _count: { department: true }
    }),
    prisma.candidate.groupBy({
      by: ["source"],
      _count: { source: true }
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { status: true }
    })
  ]);

  return {
    scorecards: [
      { label: "Employees", value: String(employeeCount), meta: "Master profiles live" },
      { label: "Pending Leave", value: String(leavePending), meta: "Manager action needed" },
      { label: "Attendance Exceptions", value: String(attendanceReview), meta: "T&A review queue" },
      { label: "Vendor Workers", value: String(vendorWorkerCount), meta: "Deployed manpower" },
      { label: "Document Risks", value: String(documentRisk), meta: "KYC/compliance attention" },
      { label: "Open Approvals", value: String(approvalPending), meta: "Cross-module inbox" },
      { label: "Notifications Sent", value: String(notificationsSent), meta: "Email, SMS, WhatsApp, dashboard" }
    ],
    aiSignals: [
      `${candidateCount} ATS records indicate stable hiring demand.`,
      `${vendorCount} vendors support staffing, transport, food, security, and facility operations.`,
      `${invoiceReview} payroll/vendor invoices should be cleared before salary payment release.`
    ],
    charts: {
      departments: employeeGroups.map((group, index) => ({
        label: group.department.slice(0, 10),
        value: String(group._count.department),
        height: Math.min(96, 30 + group._count.department * 12 + index * 2)
      })),
      sourcing: candidateSourceGroups.map((group, index) => ({
        label: group.source.slice(0, 10),
        value: String(group._count.source),
        height: Math.min(96, 30 + group._count.source * 14 + index * 2)
      })),
      invoices: invoiceStatusGroups.map((group, index) => ({
        label: group.status.slice(0, 10),
        value: String(group._count.status),
        height: Math.min(96, 24 + group._count.status * 16 + index * 2)
      }))
    }
  };
}

export async function getNotifications() {
  await ensureSeedData();

  return prisma.notification.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getGlobalSearchResults(query) {
  await ensureSeedData();

  const q = query.trim();
  if (!q) {
    return {
      employees: [],
      candidates: [],
      vendors: [],
      invoices: [],
      documents: [],
      approvals: []
    };
  }

  const contains = { contains: q };

  const [employees, candidates, vendors, invoices, documents, approvals] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [{ name: contains }, { employeeId: contains }, { department: contains }, { location: contains }]
      },
      take: 8
    }),
    prisma.candidate.findMany({
      where: { OR: [{ name: contains }, { role: contains }, { source: contains }] },
      take: 8
    }),
    prisma.vendor.findMany({
      where: { OR: [{ vendor: contains }, { category: contains }] },
      take: 8
    }),
    prisma.invoice.findMany({
      where: { OR: [{ vendor: contains }, { invoiceNo: contains }, { amount: contains }] },
      take: 8
    }),
    prisma.documentRecord.findMany({
      where: { OR: [{ owner: contains }, { docType: contains }, { module: contains }] },
      take: 8
    }),
    prisma.approvalItem.findMany({
      where: { OR: [{ title: contains }, { owner: contains }, { module: contains }] },
      take: 8
    })
  ]);

  return { employees, candidates, vendors, invoices, documents, approvals };
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
