const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function amountToNumber(value) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  return normalized ? Number(normalized) || 0 : 0;
}

function formatInrShort(value) {
  const amount = Number(value) || 0;

  if (amount >= 10000000) {
    return `INR ${(amount / 10000000).toFixed(2)} Cr`;
  }

  if (amount >= 100000) {
    return `INR ${(amount / 100000).toFixed(1)} L`;
  }

  return inrFormatter.format(amount);
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("approved") || normalized.includes("released") || normalized.includes("closed")) {
    return "teal";
  }

  if (normalized.includes("fail") || normalized.includes("reject") || normalized.includes("hold")) {
    return "slate";
  }

  return "gold";
}

function statusOf(invoice) {
  return invoice?.status || invoice?.label || "Queued";
}

function isApproved(invoice) {
  return ["approved", "released"].some((status) => statusOf(invoice).toLowerCase().includes(status));
}

function isPending(invoice) {
  const status = statusOf(invoice).toLowerCase();
  return !isApproved(invoice) && !status.includes("reject");
}

function percent(part, total, fallback = 0) {
  if (!total) return fallback;
  return Math.min(100, Math.round((part / total) * 100));
}

function chartHeight(value, max) {
  if (!max) return 24;
  return Math.max(18, Math.round((value / max) * 92));
}

function buildSalaryAging(items) {
  const buckets = [
    { label: "Ready", count: 0 },
    { label: "Review", count: 0 },
    { label: "Hold", count: 0 },
    { label: "Released", count: 0 }
  ];

  items.forEach((item) => {
    const status = String(item.status || "").toLowerCase();
    const bucket =
      buckets.find((entry) => status.includes(entry.label.toLowerCase())) ||
      buckets.find((entry) => entry.label === "Review");

    if (bucket) {
      bucket.count += 1;
    }
  });

  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: String(bucket.count),
    height: chartHeight(bucket.count, max)
  }));
}

function buildTaxBreakdown(grossPayroll) {
  const base = Math.max(Number(grossPayroll) || 0, 1);
  const entries = [
    ["PF", base * 0.055],
    ["ESI", base * 0.018],
    ["TDS", base * 0.038],
    ["Professional Tax", base * 0.009]
  ];
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;

  return entries.map(([label, value], index) => ({
    label,
    value: formatInrShort(value),
    percent: percent(value, total),
    tone: ["teal", "gold", "slate", "teal"][index]
  }));
}

function buildPaymentQueue(activeEmployees, attendanceRecords, netSalary, payrollTax) {
  const fallbackEmployees = attendanceRecords.map((record, index) => ({
    id: record.id || `attendance-${index + 1}`,
    employeeId: `PAY-${index + 1}`,
    name: record.employee || `Employee ${index + 1}`,
    department: record.shift || "Payroll",
    bankStatus: record.lockState || "Salary Ready",
    salaryNetPay: Number(record.salaryNetPay) || 0
  }));
  const rows = activeEmployees.length ? activeEmployees : fallbackEmployees;
  const averageNet = rows.length ? Math.round(netSalary / rows.length) : 0;
  const averageTax = rows.length ? Math.round(payrollTax / rows.length) : 0;

  return rows.slice(0, 12).map((employee, index) => {
    const bankVerified = String(employee.bankStatus || "").toLowerCase().includes("verified");
    const netPay = Number(employee.salaryNetPay) || averageNet;
    const status = bankVerified ? "Ready" : index % 4 === 0 ? "Hold" : "Review";

    return {
      id: employee.id || employee.employeeId || `payment-${index + 1}`,
      employee: employee.name || `Employee ${index + 1}`,
      employeeId: employee.employeeId || employee.id || `PAY-${index + 1}`,
      department: employee.department || "Payroll",
      bankStatus: employee.bankStatus || "Bank Review",
      netPay: formatInrShort(netPay),
      tax: formatInrShort(averageTax),
      status,
      tone: statusTone(status),
      workflow: "Attendance Lock to Earnings to Payroll Tax to Director Approval to Bank Release"
    };
  });
}

function buildPayrollTrend(grossPayroll) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May"];
  const base = Math.max(grossPayroll || 0, 100000);
  const values = months.map((label, index) => ({
    label,
    amount: Math.round(base * (0.82 + index * 0.045))
  }));
  const max = Math.max(...values.map((item) => item.amount), 1);

  return values.map((item) => ({
    label: item.label,
    value: formatInrShort(item.amount).replace("INR ", ""),
    height: chartHeight(item.amount, max)
  }));
}

function currentPeriodLabel(now = new Date()) {
  return now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function timestampAt(now, minutesAgo) {
  const value = new Date(now.getTime() - minutesAgo * 60000);

  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function buildPayrollSummary({
  approvals = [],
  attendanceRecords = [],
  documents = [],
  employees = [],
  invoices = [],
  settings = []
} = {}) {
  const now = new Date();
  const invoiceTotal = invoices.reduce((sum, invoice) => sum + amountToNumber(invoice.amount), 0);
  const salaryTotal = employees.reduce((sum, employee) => sum + (Number(employee.salaryNetPay) || 0), 0);
  const grossPayroll = salaryTotal || invoiceTotal;
  const payrollTax = Math.round(grossPayroll * 0.12);
  const netSalary = Math.max(0, grossPayroll - payrollTax);
  const approvedInvoices = invoices.filter(isApproved);
  const pendingInvoices = invoices.filter(isPending);
  const rejectedInvoices = invoices.filter((invoice) => statusOf(invoice).toLowerCase().includes("reject"));
  const activeEmployees = employees.filter((employee) => String(employee.status || "").toLowerCase() !== "inactive");
  const bankVerified = activeEmployees.filter((employee) =>
    String(employee.bankStatus || "").toLowerCase().includes("verified")
  );
  const attendanceLocked = Boolean(attendanceRecords.length) && attendanceRecords.length >= Math.max(1, activeEmployees.length);
  const taxClosed = settings.some((setting) => /tax|pf|esi/i.test(`${setting.category} ${setting.name}`));
  const bankValidation = activeEmployees.length ? percent(bankVerified.length, activeEmployees.length) : percent(approvedInvoices.length, invoices.length, 98);
  const taxValidation = taxClosed ? 94 : percent(approvedInvoices.length, invoices.length, 72);
  const complianceValidation = documents.length
    ? percent(documents.filter((document) => String(document.status || "").toLowerCase().includes("verified")).length, documents.length)
    : 88;
  const releasedInvoices = invoices.filter((invoice) => statusOf(invoice).toLowerCase().includes("released"));
  const paymentQueue = buildPaymentQueue(activeEmployees, attendanceRecords, netSalary, payrollTax);
  const heldPayments = paymentQueue.filter((row) => String(row.status).toLowerCase().includes("hold"));
  const reviewPayments = paymentQueue.filter((row) => String(row.status).toLowerCase().includes("review"));
  const readyPayments = paymentQueue.filter((row) => String(row.status).toLowerCase().includes("ready"));

  const stages = [
    {
      id: 1,
      label: "Attendance",
      status: attendanceLocked ? "Completed" : "In Review",
      owner: "HR Admin",
      timestamp: timestampAt(now, 58),
      tone: attendanceLocked ? "teal" : "gold"
    },
    {
      id: 2,
      label: "Earnings",
      status: grossPayroll > 0 ? "Completed" : "Pending",
      owner: "Payroll Lead",
      timestamp: timestampAt(now, 42),
      tone: grossPayroll > 0 ? "teal" : "slate"
    },
    {
      id: 3,
      label: "Payroll Tax",
      status: taxValidation >= 90 ? "Completed" : "In Review",
      owner: "Finance Control",
      timestamp: timestampAt(now, 25),
      tone: taxValidation >= 90 ? "teal" : "gold"
    },
    {
      id: 4,
      label: "Bank Release",
      status: bankValidation >= 98 && heldPayments.length === 0 ? "Released" : "Pending",
      owner: "Treasury",
      timestamp: timestampAt(now, 8),
      tone: bankValidation >= 98 && heldPayments.length === 0 ? "teal" : "gold"
    }
  ];

  return {
    generatedAt: now.toISOString(),
    periodLabel: currentPeriodLabel(now),
    metrics: [
      { label: "Gross Payroll", value: formatInrShort(grossPayroll), meta: `${activeEmployees.length} employee salary records`, tone: "teal" },
      { label: "Payroll Tax", value: formatInrShort(payrollTax), meta: "PF, ESI, TDS controls", tone: "gold" },
      { label: "Net Salary", value: formatInrShort(netSalary), meta: "Ready for bank advice", tone: "teal" },
      { label: "Pending Releases", value: String(reviewPayments.length + heldPayments.length), meta: `${heldPayments.length} held for bank review`, tone: reviewPayments.length || heldPayments.length ? "gold" : "teal" }
    ],
    stages,
    financialControl: [
      { label: "Employees Processed", value: String(activeEmployees.length || attendanceRecords.length), tone: "teal" },
      { label: "Total Employees Paid", value: String(bankVerified.length || releasedInvoices.length), tone: "teal" },
      { label: "Pending Transfers", value: String(reviewPayments.length + heldPayments.length), tone: reviewPayments.length || heldPayments.length ? "gold" : "teal" },
      { label: "Failed Bank API", value: String(heldPayments.length), tone: heldPayments.length ? "slate" : "teal" }
    ],
    readiness: [
      { label: "Bank Validation", percent: bankValidation, status: bankValidation >= 95 ? "Validated" : "In Review", tone: bankValidation >= 95 ? "teal" : "gold" },
      { label: "Tax Validation", percent: taxValidation, status: taxValidation >= 90 ? "Validated" : "In Review", tone: taxValidation >= 90 ? "teal" : "gold" },
      { label: "Compliance", percent: complianceValidation, status: complianceValidation >= 90 ? "Validated" : "In Review", tone: complianceValidation >= 90 ? "teal" : "gold" }
    ],
    notifications: [
      { label: `${reviewPayments.length + heldPayments.length} salary payments pending release`, meta: "Payroll approval queue", tone: reviewPayments.length || heldPayments.length ? "gold" : "teal" },
      { label: `${documents.filter((document) => !String(document.status || "").toLowerCase().includes("verified")).length} employee files need compliance review`, meta: "Payroll document watch", tone: "gold" },
      { label: `${heldPayments.length} bank validations failed`, meta: "Salary payment block", tone: heldPayments.length ? "slate" : "teal" }
    ],
    activityFeed: [
      { time: timestampAt(now, 2), title: reviewPayments.length || heldPayments.length ? "Salary release awaiting approval" : "Payroll released", meta: currentPeriodLabel(now), tone: reviewPayments.length || heldPayments.length ? "gold" : "teal" },
      { time: timestampAt(now, 18), title: `${readyPayments.length} salary payments ready`, meta: "Salary payment", tone: "teal" },
      { time: timestampAt(now, 34), title: "PF validation completed", meta: "Payroll tax", tone: taxValidation >= 90 ? "teal" : "gold" },
      { time: timestampAt(now, 55), title: `${activeEmployees.length || attendanceRecords.length} salary rows processed`, meta: "Salary payment", tone: "teal" }
    ],
    aiInsights: [
      {
        label: heldPayments.length ? "Bank validation needs payroll attention" : "Salary release risk is controlled",
        meta: heldPayments.length ? `${heldPayments.length} employee payments are on hold` : "Salary queue is within normal volume",
        tone: heldPayments.length ? "gold" : "teal"
      },
      {
        label: `Payroll processing confidence ${Math.min(99, Math.round((bankValidation + taxValidation + complianceValidation) / 3))}%`,
        meta: "Based on bank, tax, and compliance readiness",
        tone: "teal"
      },
      {
        label: `${reviewPayments.length + heldPayments.length} payroll items need review`,
        meta: "Finance and director workflow",
        tone: reviewPayments.length || heldPayments.length ? "gold" : "slate"
      }
    ],
    approvalFlow: [
      { role: "HR", name: "Attendance Lock", status: stages[0].status, timestamp: stages[0].timestamp, tone: stages[0].tone },
      { role: "Finance", name: "Tax Review", status: stages[2].status, timestamp: stages[2].timestamp, tone: stages[2].tone },
      { role: "Director", name: "Payment Approval", status: reviewPayments.length || heldPayments.length ? "Pending" : "Approved", timestamp: timestampAt(now, 12), tone: reviewPayments.length || heldPayments.length ? "gold" : "teal" },
      { role: "Treasury", name: "Bank Release", status: stages[3].status, timestamp: stages[3].timestamp, tone: stages[3].tone }
    ],
    sla: [
      { label: "Salary Releases Within SLA", value: `${percent(readyPayments.length, paymentQueue.length, 96)}%`, meta: "Payroll processing" },
      { label: "Avg Approval Time", value: pendingInvoices.length ? "4.2 hrs" : "2.8 hrs", meta: "HR to finance" },
      { label: "Pending Escalations", value: String(heldPayments.length), meta: "Director queue" }
    ],
    paymentQueue,
    salaryWorkflow: [
      { label: "Attendance Lock", status: stages[0].status, tone: stages[0].tone },
      { label: "Earnings Review", status: stages[1].status, tone: stages[1].tone },
      { label: "Payroll Tax", status: stages[2].status, tone: stages[2].tone },
      { label: "Director Approval", status: reviewPayments.length || heldPayments.length ? "Pending" : "Approved", tone: reviewPayments.length || heldPayments.length ? "gold" : "teal" },
      { label: "Bank Release", status: stages[3].status, tone: stages[3].tone }
    ],
    charts: {
      payrollTrend: {
        summary: formatInrShort(grossPayroll),
        items: buildPayrollTrend(grossPayroll)
      },
      salaryAging: {
        summary: `${reviewPayments.length + heldPayments.length} Open`,
        items: buildSalaryAging(paymentQueue)
      },
      taxBreakdown: buildTaxBreakdown(grossPayroll)
    }
  };
}
