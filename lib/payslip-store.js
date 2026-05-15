import { createResource, getResource, updateResource } from "@/lib/local-api-store";

export function normalizePayslipMonth(value, fallback = new Date()) {
  const normalized = String(value || "").trim();
  const inputMatch = normalized.match(/^(\d{4})-(\d{2})/);

  if (inputMatch) {
    return `${inputMatch[1]}-${inputMatch[2]}`;
  }

  const parsed = new Date(`1 ${normalized}`);
  const date = Number.isNaN(parsed.getTime()) ? fallback : parsed;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatPayslipMonth(monthKey) {
  const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return String(monthKey || "");
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric"
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

export function getPayslipRecords() {
  return getResource("payslips") || [];
}

export function upsertPayslipRecord(payload) {
  const monthKey = normalizePayslipMonth(payload.monthKey || payload.month || payload.monthLabel);
  const employeeId = String(payload.employeeId || payload.id || payload.name || payload.employee || "employee").trim();
  const id = `payslip-${employeeId}-${monthKey}`.replace(/[^a-zA-Z0-9-]/g, "-");
  const existing = getPayslipRecords().find((record) => record.id === id);
  const record = {
    ...payload,
    id,
    employeeId,
    employee: payload.employee || payload.name || "",
    monthKey,
    monthLabel: payload.monthLabel || payload.month || formatPayslipMonth(monthKey),
    status: "Shared",
    sharedAt: new Date().toISOString()
  };

  return existing ? updateResource("payslips", id, record) : createResource("payslips", record);
}
