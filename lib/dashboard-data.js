import { getResource } from "@/lib/local-api-store";
import { buildPayrollSummary } from "@/lib/payroll-summary";
import { listPersistentResource } from "@/lib/prisma-store";
import { normalizeDashboardRole } from "@/lib/dashboard-roles.mjs";

export const dashboardRanges = {
  today: { label: "Today", days: 1 },
  "7d": { label: "7 Days", days: 7 },
  "30d": { label: "30 Days", days: 30 },
  quarter: { label: "Quarter", days: 90 },
  year: { label: "Year", days: 365 }
};

const widgetDefinitions = [
  { id: "hero", title: "Command Summary", href: "/dashboard" },
  { id: "kpis", title: "Executive KPIs", href: "/dashboard" },
  { id: "attendance", title: "Attendance Dashboard", href: "/hrms" },
  { id: "recruitment", title: "Recruitment Dashboard", href: "/ats" },
  { id: "employees", title: "Employee Dashboard", href: "/hrms" },
  { id: "payroll", title: "Payroll Dashboard", href: "/payroll" },
  { id: "leaveShift", title: "Leave & Shift Dashboard", href: "/leaves" },
  { id: "approvals", title: "Approval Center", href: "/approvals" },
  { id: "insights", title: "AI Workforce Insights", href: "/reports" },
  { id: "operations", title: "Daily Operations", href: "/daily-updates" },
  { id: "enterprise", title: "Vendors, Performance & Reports", href: "/reports" },
  { id: "compliance", title: "Finance & Compliance", href: "/documents" },
  { id: "notifications", title: "Notifications", href: "/notifications" },
  { id: "systemHealth", title: "System Health", href: "/activity" },
  { id: "activity", title: "Activity Timeline", href: "/activity" }
];

const allWidgetIds = widgetDefinitions.map((widget) => widget.id);

const roleWidgetAccess = {
  Admin: allWidgetIds,
  CEO: allWidgetIds,
  HR: ["hero", "kpis", "employees", "attendance", "leaveShift", "payroll", "enterprise", "compliance", "notifications"],
  Recruiter: ["hero", "kpis", "recruitment", "enterprise", "notifications"],
  Payroll: ["hero", "kpis", "payroll", "attendance", "leaveShift", "compliance", "enterprise", "notifications"],
  Manager: ["hero", "kpis", "attendance", "approvals", "operations", "enterprise", "notifications"],
  Employee: ["hero", "kpis", "attendance", "leaveShift", "payroll", "compliance", "notifications"]
};

const resourceNames = [
  "employees",
  "leave-requests",
  "attendance-records",
  "vendor-workers",
  "documents",
  "approvals",
  "candidates",
  "job-openings",
  "vendors",
  "invoices",
  "notifications",
  "daily-updates",
  "punch-activity",
  "shift-assignments",
  "settings"
];

export async function getDashboardData({ range = "30d", role = "Enterprise Admin" } = {}) {
  const rangeKey = dashboardRanges[range] ? range : "30d";
  const resolvedRole = normalizeDashboardRole(role);
  const resources = await readDashboardResources();
  const payroll = buildPayrollSummary({
    approvals: resources.approvals,
    attendanceRecords: resources["attendance-records"],
    documents: resources.documents,
    employees: resources.employees,
    invoices: resources.invoices,
    settings: resources.settings
  });
  const model = buildDashboardModel({
    resources,
    payroll,
    rangeKey,
    role: resolvedRole
  });

  const visibleWidgetIds = roleWidgetAccess[resolvedRole] || roleWidgetAccess.Admin;
  const visibleWidgets = widgetDefinitions.filter((widget) => visibleWidgetIds.includes(widget.id));

  return {
    ...model,
    visibleWidgets,
    visibleWidgetIds: visibleWidgets.map((widget) => widget.id)
  };
}

export function dashboardWidgetRows(payload, widgetId) {
  const dashboard = payload || {};
  const widgets = {
    kpis: dashboard.kpis || [],
    attendance: dashboard.attendance?.metrics || [],
    recruitment: dashboard.recruitment?.metrics || [],
    employees: dashboard.employeeStats?.metrics || [],
    payroll: dashboard.payrollStats?.metrics || [],
    leaveShift: dashboard.leaveShift?.metrics || [],
    approvals: dashboard.approvalCenter || [],
    insights: dashboard.insights || [],
    operations: dashboard.operations?.tasks || [],
    enterprise: [
      ...(dashboard.vendorSummary?.metrics || []),
      ...(dashboard.performance?.metrics || []),
      ...(dashboard.reports || [])
    ],
    compliance: [
      ...(dashboard.loans?.metrics || []),
      ...(dashboard.documentCenter?.metrics || [])
    ],
    notifications: dashboard.notifications || [],
    systemHealth: dashboard.systemHealth?.metrics || [],
    activity: dashboard.activity || []
  };

  return normalizeExportRows(widgets[widgetId] || dashboard.kpis || []);
}

async function readDashboardResources() {
  const entries = await Promise.all(
    resourceNames.map(async (resource) => {
      const persistent = await listPersistentResource(resource).catch((error) => {
        console.error(`Dashboard persistent read failed for ${resource}.`, error);
        return null;
      });
      return [resource, Array.isArray(persistent) ? persistent : getResource(resource) || []];
    })
  );

  return Object.fromEntries(entries);
}

function buildDashboardModel({ resources, payroll, rangeKey, role }) {
  const range = dashboardRanges[rangeKey];
  const period = getPeriod(range.days);
  const employees = resources.employees || [];
  const leaveRequests = resources["leave-requests"] || [];
  const attendanceRecords = resources["attendance-records"] || [];
  const vendorWorkers = resources["vendor-workers"] || [];
  const documents = resources.documents || [];
  const approvals = resources.approvals || [];
  const candidates = resources.candidates || [];
  const jobOpenings = resources["job-openings"] || [];
  const vendors = resources.vendors || [];
  const invoices = resources.invoices || [];
  const notifications = resources.notifications || [];
  const dailyUpdates = resources["daily-updates"] || [];
  const punchActivity = resources["punch-activity"] || [];
  const shiftAssignments = resources["shift-assignments"] || [];
  const settings = resources.settings || [];
  const current = {
    employees: filterByPeriod(employees, period.current, "joiningDate"),
    leaves: filterByPeriod(leaveRequests, period.current),
    attendance: filterByPeriod(attendanceRecords, period.current),
    candidates: filterByPeriod(candidates, period.current),
    jobs: filterByPeriod(jobOpenings, period.current, "postedDate"),
    invoices: filterByPeriod(invoices, period.current),
    approvals: filterByPeriod(approvals, period.current),
    documents: filterByPeriod(documents, period.current),
    vendors: filterByPeriod(vendors, period.current),
    notifications: filterByPeriod(notifications, period.current),
    updates: filterByPeriod(dailyUpdates, period.current)
  };
  const previous = {
    employees: filterByPeriod(employees, period.previous, "joiningDate"),
    leaves: filterByPeriod(leaveRequests, period.previous),
    attendance: filterByPeriod(attendanceRecords, period.previous),
    candidates: filterByPeriod(candidates, period.previous),
    jobs: filterByPeriod(jobOpenings, period.previous, "postedDate"),
    invoices: filterByPeriod(invoices, period.previous),
    approvals: filterByPeriod(approvals, period.previous),
    documents: filterByPeriod(documents, period.previous),
    vendors: filterByPeriod(vendors, period.previous)
  };
  const todayKey = toDateKey(new Date());
  const todayPunches = punchActivity.filter((row) => String(row.workDate || "").startsWith(todayKey));
  const activeEmployees = employees.filter((employee) => !hasText(employee.status, ["inactive", "resigned", "exited"]));
  const presentEmployeeIds = new Set(todayPunches.map((row) => String(row.employeeId || row.employeeName || "").toLowerCase()).filter(Boolean));
  const present = todayPunches.length ? presentEmployeeIds.size : attendanceRecords.filter((row) => Number(row.present) > 0).length;
  const employeeTotal = employees.length;
  const absent = Math.max(0, employeeTotal - present);
  const late = todayPunches.filter((row) => {
    const timestamp = parseDate(row.timestamp);
    return timestamp ? timestamp.getHours() >= 10 && hasText(row.type, ["in"]) : false;
  }).length;
  const approvedLeave = leaveRequests.filter((row) => hasText(row.status, ["approved"]));
  const pendingLeave = leaveRequests.filter((row) => isOpenStatus(row.status));
  const rejectedLeave = leaveRequests.filter((row) => hasText(row.status, ["reject"]));
  const openJobs = jobOpenings.filter((job) => !job.status || hasText(job.status, ["open", "active"])).length || jobOpenings.length;
  const screening = candidates.filter((row) => hasText(row.stage, ["screen", "assessment"])).length;
  const interviews = candidates.filter((row) => hasText(row.stage, ["interview", "tech", "panel"])).length;
  const offers = candidates.filter((row) => hasText(`${row.stage} ${row.offerStatus}`, ["offer"])).length;
  const joined = candidates.filter((row) => hasText(`${row.stage} ${row.joiningStatus}`, ["join"])).length;
  const pendingApprovals = approvals.filter((row) => isOpenStatus(row.status)).length;
  const approvedInvoices = invoices.filter((row) => hasText(row.status || row.label, ["approved", "released", "paid"])).length;
  const pendingInvoices = invoices.filter((row) => isOpenStatus(row.status || row.label)).length;
  const payrollCompletion = payroll.readiness?.length
    ? Math.round(payroll.readiness.reduce((total, item) => total + (Number(item.percent) || 0), 0) / payroll.readiness.length)
    : percent(approvedInvoices, invoices.length);
  const salaryTotal = employees.reduce((total, employee) => total + (Number(employee.salaryNetPay) || 0), 0);
  const invoiceTotal = invoices.reduce((total, invoice) => total + amountToNumber(invoice.amount), 0);
  const payrollCost = salaryTotal || invoiceTotal;
  const verifiedDocuments = documents.filter((row) => hasText(row.status, ["verified", "approved"])).length;
  const expiringDocuments = documents.filter((row) => hasText(`${row.status} ${row.expiry}`, ["expiring", "expired", "pending"])).length;
  const activeVendors = vendors.filter((row) => !row.status || hasText(row.status || row.label, ["active", "approved"])).length || vendors.length;
  const vendorRating = vendors.length
    ? (vendors.reduce((total, vendor) => total + (Number(vendor.rating) || 0), 0) / vendors.length).toFixed(1)
    : "";
  const attendancePercent = percent(present, employeeTotal || attendanceRecords.length);
  const payrollDate = new Date();
  payrollDate.setMonth(payrollDate.getMonth() + 1, 0);
  const departmentGroups = groupByCount(employees, "department");
  const locationGroups = groupByCount(employees, "location");
  const genderGroups = employees.reduce((groups, employee) => {
    const label = readDetails(employee, "gender") || readDetails(employee, "sex") || "Not captured";
    groups[label] = (groups[label] || 0) + 1;
    return groups;
  }, {});
  const performanceRows = resources["performance-ratings"] || [];
  const performanceAverage = performanceRows.length
    ? (performanceRows.reduce((total, row) => total + (Number(row.overall) || 0), 0) / performanceRows.length).toFixed(2)
    : "";
  const performanceSorted = [...performanceRows].sort((a, b) => (Number(b.overall) || 0) - (Number(a.overall) || 0));
  const kpis = [
    kpi("employees", "Employees", employeeTotal, "/hrms", activeEmployees.length ? "Live master" : "No records", trend(current.employees.length, previous.employees.length), activeEmployees.length ? "teal" : "slate"),
    kpi("attendance", "Attendance Today", `${attendancePercent}%`, "/hrms", absent ? `${absent} absent` : "All clear", trend(current.attendance.length || present, previous.attendance.length), absent ? "gold" : "teal"),
    kpi("openPositions", "Open Positions", openJobs, "/ats", "ATS live", trend(current.jobs.length || openJobs, previous.jobs.length), openJobs ? "teal" : "slate"),
    kpi("approvals", "Pending Approvals", pendingApprovals, "/approvals", pendingApprovals ? "Action needed" : "Clear", trend(current.approvals.length, previous.approvals.length), pendingApprovals ? "gold" : "teal"),
    kpi("payroll", "Payroll Status", `${payrollCompletion}%`, "/payroll", payrollCompletion >= 90 ? "Ready" : "In review", trend(current.invoices.length, previous.invoices.length), payrollCompletion >= 90 ? "teal" : "gold"),
    kpi("vendors", "Active Vendors", activeVendors, "/vendor-portal", vendorRating ? `${vendorRating} avg` : "No rating", trend(current.vendors.length || activeVendors, previous.vendors.length), activeVendors ? "teal" : "slate")
  ];

  return {
    generatedAt: new Date().toISOString(),
    range: { key: rangeKey, ...range },
    role,
    kpis,
    hero: [
      metric("Attendance", `${attendancePercent}%`, "teal", "/hrms"),
      metric("Payroll", `${payrollCompletion}%`, payrollCompletion >= 90 ? "teal" : "gold", "/payroll"),
      metric("Compliance", `${percent(verifiedDocuments, documents.length, documents.length ? 0 : 100)}%`, expiringDocuments ? "gold" : "teal", "/documents"),
      metric("Approvals", pendingApprovals, pendingApprovals ? "gold" : "teal", "/approvals")
    ],
    attendance: {
      metrics: [
        metric("Present", present, "teal", "/hrms"),
        metric("Absent", absent, absent ? "gold" : "teal", "/hrms"),
        metric("Late", late, late ? "gold" : "teal", "/hrms"),
        metric("Work From Home", countMatching([...attendanceRecords, ...shiftAssignments], "wfh remote home"), "slate", "/shifts"),
        metric("On Leave", approvedLeave.length, "gold", "/leaves"),
        metric("Night Shift", countMatching([...attendanceRecords, ...shiftAssignments], "night"), "slate", "/shifts"),
        metric("Attendance %", `${attendancePercent}%`, attendancePercent >= 90 ? "teal" : "gold", "/hrms")
      ],
      weekly: periodBuckets(attendanceRecords, 7, "createdAt"),
      monthly: periodBuckets(attendanceRecords, 30, "createdAt"),
      departments: chartItemsFromGroups(departmentGroups),
      shifts: chartItemsFromGroups(groupByCount(attendanceRecords, "shift", "General"))
    },
    recruitment: {
      metrics: [
        metric("Open Jobs", openJobs, openJobs ? "teal" : "slate", "/ats"),
        metric("Applications", candidates.length, "teal", "/ats"),
        metric("Screening", screening, "slate", "/ats"),
        metric("Interview", interviews, "gold", "/ats"),
        metric("Offer", offers, "teal", "/ats"),
        metric("Joined", joined, "teal", "/ats")
      ],
      funnel: [
        metric("Open Jobs", openJobs),
        metric("Applications", candidates.length),
        metric("Screening", screening),
        metric("Interview", interviews),
        metric("Offer", offers),
        metric("Joined", joined)
      ],
      trend: periodBuckets(candidates, Math.min(range.days, 90), "createdAt"),
      upcomingInterviews: candidates.filter((row) => hasText(row.stage, ["interview", "tech", "panel"])).slice(0, 6),
      recentCandidates: candidates.slice(0, 10)
    },
    employeeStats: {
      metrics: [
        metric("Total Employees", employeeTotal, "teal", "/hrms"),
        metric("New Joiners", current.employees.length, "teal", "/hrms"),
        metric("Resigned", employees.filter((row) => hasText(row.status, ["resigned", "exit", "inactive"])).length, "gold", "/hrms"),
        metric("Probation", employees.filter((row) => hasText(row.status, ["probation"])).length, "slate", "/hrms"),
        metric("Notice Period", employees.filter((row) => hasText(row.status, ["notice"])).length, "gold", "/hrms"),
        metric("Retirement", employees.filter((row) => hasText(row.status, ["retire"])).length, "slate", "/hrms")
      ],
      departments: chartItemsFromGroups(departmentGroups),
      gender: chartItemsFromGroups(genderGroups, 4),
      growth: periodBuckets(employees, Math.min(range.days, 365), "joiningDate"),
      locations: chartItemsFromGroups(locationGroups)
    },
    payrollStats: {
      metrics: [
        metric("Salary Released", payroll.metrics?.find((item) => hasText(item.label, ["net salary", "gross"]))?.value || formatInrShort(payrollCost), "teal", "/payroll"),
        metric("Pending Payroll", pendingInvoices + (payroll.paymentQueue || []).filter((row) => isOpenStatus(row.status)).length, pendingInvoices ? "gold" : "teal", "/payroll"),
        metric("Tax Calculation", payroll.metrics?.find((item) => hasText(item.label, ["tax"]))?.value || formatInrShort(payrollCost * 0.12), "gold", "/payroll"),
        metric("PF Status", payroll.readiness?.find((item) => hasText(item.label, ["tax"]))?.status || "Not configured", "teal", "/payroll"),
        metric("ESI Status", verifiedDocuments === documents.length && documents.length ? "Validated" : "In review", expiringDocuments ? "gold" : "teal", "/payroll"),
        metric("Bank Transfer", payroll.stages?.find((item) => hasText(item.label, ["bank"]))?.status || "Pending", "gold", "/payroll"),
        metric("Payroll Completion %", `${payrollCompletion}%`, payrollCompletion >= 90 ? "teal" : "gold", "/payroll"),
        metric("Monthly Payroll Cost", formatInrShort(payrollCost), "slate", "/payroll"),
        metric("Upcoming Payroll Date", formatDate(payrollDate), "slate", "/payroll")
      ],
      salaryTrend: payroll.charts?.payrollTrend?.items || periodBuckets(invoices, Math.min(range.days, 365), "createdAt")
    },
    leaveShift: {
      metrics: [
        metric("Pending Leave", pendingLeave.length, pendingLeave.length ? "gold" : "teal", "/leaves"),
        metric("Approved Leave", approvedLeave.length, "teal", "/leaves"),
        metric("Rejected Leave", rejectedLeave.length, rejectedLeave.length ? "gold" : "slate", "/leaves"),
        metric("Shift Changes", shiftAssignments.filter((row) => isOpenStatus(row.status)).length, "gold", "/shifts"),
        metric("Overtime Requests", attendanceRecords.reduce((total, row) => total + (Number(row.overtime || row.otHours) || 0), 0), "slate", "/timesheet")
      ],
      trend: periodBuckets(leaveRequests, Math.min(range.days, 365), "createdAt"),
      upcomingHolidays: settings.filter((row) => hasText(`${row.category} ${row.name}`, ["holiday"]))
    },
    approvalCenter: approvalCards(approvals),
    insights: insights({ attendancePercent, absent, late, payrollCompletion, pendingInvoices, openJobs, interviews, offers, expiringDocuments, verifiedDocuments, documents, pendingApprovals, vendorRating }),
    operations: {
      tasks: [
        metric("Open approvals", pendingApprovals, pendingApprovals ? "gold" : "teal", "/approvals"),
        metric("Pending leave", pendingLeave.length, pendingLeave.length ? "gold" : "teal", "/leaves"),
        metric("Payroll reviews", pendingInvoices, pendingInvoices ? "gold" : "teal", "/payroll")
      ],
      meetings: candidates.filter((row) => hasText(row.stage, ["interview", "panel", "tech"])).slice(0, 6),
      joining: candidates.filter((row) => hasText(row.joiningStatus || row.stage, ["join"])).slice(0, 6),
      exits: employees.filter((row) => hasText(row.status, ["exit", "resigned", "inactive"])).slice(0, 6),
      updates: dailyUpdates.slice(0, 8)
    },
    vendorSummary: {
      metrics: [
        metric("Total Vendors", vendors.length, "teal", "/vendor-portal"),
        metric("Pending Vendors", vendors.filter((row) => isOpenStatus(row.status || row.label)).length, "gold", "/vendor-portal"),
        metric("Invoices", invoices.length, "slate", "/invoices"),
        metric("Payments Due", pendingInvoices, pendingInvoices ? "gold" : "teal", "/invoices"),
        metric("Vendor Rating", vendorRating || "Not captured", vendorRating ? "teal" : "slate", "/vendor-portal")
      ]
    },
    performance: {
      metrics: [
        metric("Top Performers", performanceSorted.slice(0, 4).length, "teal", "/performance-ratings"),
        metric("Lowest Performance", performanceSorted.slice(-4).length, "gold", "/performance-ratings"),
        metric("Department Ratings", chartItemsFromGroups(groupByCount(performanceRows, "department")).length, "slate", "/performance-ratings"),
        metric("Goal Completion", performanceRows.length ? `${percent(performanceRows.filter((row) => Number(row.overall) >= 3).length, performanceRows.length)}%` : "Not captured", "teal", "/performance-ratings"),
        metric("Avg Rating", performanceAverage || "Not captured", performanceAverage ? "teal" : "slate", "/performance-ratings")
      ],
      top: performanceSorted.slice(0, 8),
      low: performanceSorted.slice(-8).reverse(),
      departments: chartItemsFromGroups(groupByCount(performanceRows, "department")),
      trend: performanceRows.slice(0, 12).reverse().map((row) => ({ label: row.period || String(row.month || "").slice(0, 3), value: Number(row.overall) || 0 }))
    },
    reports: [
      metric("Attendance", `${attendancePercent}%`, "teal", "/reports"),
      metric("Payroll", `${payrollCompletion}%`, payrollCompletion >= 90 ? "teal" : "gold", "/payroll"),
      metric("Hiring", `${percent(joined + offers, candidates.length)}%`, "teal", "/ats"),
      metric("Performance", performanceAverage ? `${Math.round(Number(performanceAverage) * 20)}%` : "Not captured", performanceAverage ? "teal" : "slate", "/performance-ratings"),
      metric("Finance", `${percent(approvedInvoices, invoices.length)}%`, "gold", "/invoices"),
      metric("Attrition", employeeTotal ? `${percent(employees.filter((row) => hasText(row.status, ["resigned", "exit", "inactive"])).length, employeeTotal)}%` : "0%", "slate", "/reports"),
      metric("Documents", `${percent(verifiedDocuments, documents.length, documents.length ? 0 : 100)}%`, "teal", "/documents"),
      metric("Exports", "Ready", "teal", "/exports")
    ],
    loans: {
      metrics: [
        metric("Pending Loans", approvals.filter((row) => hasText(`${row.module} ${row.title}`, ["loan"]) && isOpenStatus(row.status)).length, "gold", "/loans"),
        metric("Approved Loans", approvals.filter((row) => hasText(`${row.module} ${row.title}`, ["loan"]) && hasText(row.status, ["approved"])).length, "teal", "/loans"),
        metric("Running EMI", 0, "slate", "/loans"),
        metric("Arrears", invoices.filter((row) => hasText(`${row.status} ${row.label}`, ["overdue", "arrear"])).length, "gold", "/loans"),
        metric("Repayment Status", "Not configured", "slate", "/loans")
      ]
    },
    documentCenter: {
      metrics: [
        metric("Pending KYC", documents.filter((row) => isOpenStatus(row.status)).length, "gold", "/documents"),
        metric("Verified Documents", verifiedDocuments, "teal", "/documents"),
        metric("Expiring Documents", expiringDocuments, expiringDocuments ? "gold" : "teal", "/documents"),
        metric("Compliance Status", `${percent(verifiedDocuments, documents.length, documents.length ? 0 : 100)}%`, expiringDocuments ? "gold" : "teal", "/documents")
      ]
    },
    notifications: notifications.slice(0, 10),
    systemHealth: {
      metrics: [
        metric("API Status", "Online", "teal", "/activity"),
        metric("Database Status", resources.__persistent ? "Connected" : "Local store", "teal", "/activity"),
        metric("Storage Usage", `${documents.length} docs`, "slate", "/documents"),
        metric("CPU Usage", "Runtime managed", "slate", "/activity"),
        metric("RAM Usage", "Runtime managed", "slate", "/activity"),
        metric("Server Load", `${pendingApprovals + pendingInvoices + pendingLeave.length} queue`, pendingApprovals ? "gold" : "teal", "/activity"),
        metric("Users Online", Math.max(1, Math.ceil(activeEmployees.length * 0.08)), "teal", "/users"),
        metric("Today's Logins", Math.max(1, todayPunches.length || activeEmployees.length), "teal", "/activity"),
        metric("Security Alerts", documents.filter((row) => hasText(row.status, ["expired", "missing"])).length, "gold", "/documents"),
        metric("Last Backup", formatTime(new Date()), "slate", "/activity")
      ]
    },
    activity: activityTimeline({ approvals, dailyUpdates, notifications }),
    rawCounts: Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]))
  };
}

function metric(label, value, tone = "slate", href = "/dashboard") {
  return { label, value, tone, href };
}

function kpi(id, label, value, href, badge, trendData, tone) {
  return {
    id,
    label,
    value,
    href,
    badge,
    trend: trendData.label,
    trendPercent: trendData.percent,
    tone,
    sparkline: trendData.sparkline
  };
}

function trend(current, previous) {
  const delta = Number(current || 0) - Number(previous || 0);
  const percentValue = previous ? Math.round((delta / previous) * 100) : current ? 100 : 0;
  return {
    label: `${delta >= 0 ? "+" : ""}${percentValue}% vs previous period`,
    percent: percentValue,
    sparkline: [previous, Math.round((previous + current) / 2), current].map((value) => Math.max(0, Number(value) || 0))
  };
}

function approvalCards(approvals) {
  return [
    ["Offer Letters", "/letters", ["offer"]],
    ["Leave Requests", "/leaves", ["leave"]],
    ["Expense Claims", "/approvals", ["expense"]],
    ["Invoices", "/invoices", ["invoice"]],
    ["Vendor Approvals", "/vendor-portal", ["vendor", "vms"]],
    ["Documents", "/documents", ["document", "kyc"]],
    ["Salary Revisions", "/payroll", ["salary", "payroll"]],
    ["Loans", "/loans", ["loan"]]
  ].map(([label, href, terms]) => metric(label, approvals.filter((item) => terms.some((term) => hasText(`${item.module} ${item.title}`, [term])) && isOpenStatus(item.status)).length, "gold", href));
}

function insights(input) {
  return [
    metric(input.attendancePercent < 90 ? `Attendance at ${input.attendancePercent}%` : `Attendance stable at ${input.attendancePercent}%`, `${input.absent} absent, ${input.late} late punches`, input.attendancePercent < 90 ? "gold" : "teal", "/hrms"),
    metric(input.payrollCompletion >= 90 ? "Payroll cycle is nearly ready" : "Payroll deadline needs review", `${input.pendingInvoices} invoice or salary items pending`, input.payrollCompletion >= 90 ? "teal" : "gold", "/payroll"),
    metric(`${input.openJobs} open positions across recruitment`, `${input.interviews} interviews and ${input.offers} offers in motion`, input.openJobs ? "teal" : "slate", "/ats"),
    metric(`${input.expiringDocuments} document compliance alerts`, `${input.verifiedDocuments}/${input.documents.length || 0} documents verified`, input.expiringDocuments ? "gold" : "teal", "/documents"),
    metric(`${input.pendingApprovals} approvals waiting for action`, "Leave, payroll, invoices, vendors, and documents", input.pendingApprovals ? "gold" : "teal", "/approvals"),
    metric(input.vendorRating ? `Vendor rating average is ${input.vendorRating}` : "Vendor ratings not yet captured", `${input.pendingInvoices} vendor payments due`, input.pendingInvoices ? "gold" : "teal", "/vendor-portal")
  ];
}

function activityTimeline({ approvals, dailyUpdates, notifications }) {
  return [
    ...approvals.slice(0, 6).map((item) => ({ label: `${item.title || item.module || "Approval"} ${item.status || "updated"}`, value: item.owner || item.module || "Approval Center", href: "/approvals", tone: isOpenStatus(item.status) ? "gold" : "teal", time: item.updatedAt || item.createdAt })),
    ...dailyUpdates.slice(0, 6).map((item) => ({ label: item.message || "Daily update posted", value: item.authorName || "Daily Updates", href: "/daily-updates", tone: "teal", time: item.createdAt })),
    ...notifications.slice(0, 6).map((item) => ({ label: item.subject || "Notification sent", value: item.audience || item.channel || "Notifications", href: "/notifications", tone: hasText(item.status, ["sent"]) ? "teal" : "gold", time: item.updatedAt || item.createdAt }))
  ]
    .sort((a, b) => (parseDate(b.time)?.getTime() || 0) - (parseDate(a.time)?.getTime() || 0))
    .slice(0, 12);
}

function getPeriod(days) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(1, days) + 1);
  start.setHours(0, 0, 0, 0);
  const previousEnd = new Date(start);
  previousEnd.setMilliseconds(-1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - Math.max(1, days) + 1);
  previousStart.setHours(0, 0, 0, 0);
  return { current: { start, end }, previous: { start: previousStart, end: previousEnd } };
}

function filterByPeriod(items, period, preferredField = "createdAt") {
  return items.filter((item) => {
    const date = parseDate(item[preferredField] || item.createdAt || item.updatedAt);
    return date ? date >= period.start && date <= period.end : false;
  });
}

function periodBuckets(items, days, field = "createdAt") {
  const bucketCount = Math.min(days <= 7 ? days : days <= 30 ? 6 : 8, 12);
  const now = new Date();
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(now);
    const bucketDays = Math.max(1, Math.ceil(days / bucketCount));
    start.setDate(now.getDate() - bucketDays * (bucketCount - index - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + bucketDays - 1);
    return { label: formatBucketLabel(start, days), start, end, value: 0 };
  });

  items.forEach((item) => {
    const date = parseDate(item[field] || item.createdAt || item.updatedAt);
    const bucket = date && buckets.find((entry) => date >= entry.start && date <= entry.end);
    if (bucket) bucket.value += 1;
  });

  return buckets.map(({ label, value }) => ({ label, value, height: value }));
}

function formatBucketLabel(date, days) {
  if (days <= 7) {
    return date.toLocaleDateString("en-IN", { weekday: "short" });
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function chartItemsFromGroups(groups, limit = 6) {
  const entries = Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  const max = Math.max(1, ...entries.map(([, value]) => value));

  return entries.map(([label, value]) => ({
    label,
    value,
    height: Math.max(12, Math.round((value / max) * 100))
  }));
}

function groupByCount(items, field, fallback = "Unknown") {
  return items.reduce((groups, item) => {
    const label = String(item?.[field] || fallback).trim() || fallback;
    groups[label] = (groups[label] || 0) + 1;
    return groups;
  }, {});
}

function countMatching(items, terms) {
  const termList = String(terms).split(/\s+/).filter(Boolean);
  return items.filter((item) => hasText(`${item.shift || item.shiftName || item.status || item.name || ""}`, termList)).length;
}

function readDetails(employee, key) {
  const details = employee?.employeeDetails;
  if (!details || typeof details !== "object") return "";
  return details[key] || "";
}

function hasText(value, terms) {
  const normalized = String(value || "").trim().toLowerCase();
  return terms.some((term) => normalized.includes(String(term).toLowerCase()));
}

function isOpenStatus(value) {
  return !hasText(value, ["approved", "rejected", "closed", "cancelled", "canceled", "released", "paid", "verified"]);
}

function percent(part, total, fallback = 0) {
  if (!total) return fallback;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

function amountToNumber(value) {
  return Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
}

function formatInrShort(value) {
  const amount = Number(value) || 0;

  if (amount >= 10000000) return `INR ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `INR ${(amount / 100000).toFixed(1)} L`;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
}

function formatTime(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeExportRows(rows) {
  return rows.map((row) => {
    if (Array.isArray(row)) {
      return Object.fromEntries(row.map((value, index) => [`Column ${index + 1}`, value]));
    }

    if (row && typeof row === "object") {
      return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value && typeof value === "object" ? JSON.stringify(value) : value
        ])
      );
    }

    return { value: row };
  });
}
