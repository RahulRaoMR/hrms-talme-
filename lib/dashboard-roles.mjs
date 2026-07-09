export function normalizeDashboardRole(role = "") {
  const value = String(role || "").trim();
  const normalized = value.toLowerCase();

  if (!normalized) return "Admin";
  if (["admin", "administrator", "super admin", "enterprise admin"].includes(normalized)) return "Admin";
  if (/ceo|chief executive|chief people|chief/i.test(normalized)) return "CEO";
  if (["employee", "employee hrms", "staff", "self service"].includes(normalized) || normalized.includes("employee")) return "Employee";
  if (["hr", "hr admin", "human resources"].includes(normalized)) return "HR";
  if (["ats", "recruiter", "recruitment", "talent acquisition"].includes(normalized) || normalized.includes("recruit")) return "Recruiter";
  if (["payroll", "finance", "finance approver", "payroll + ats"].includes(normalized) || normalized.includes("payroll") || normalized.includes("finance")) return "Payroll";
  if (["manager", "operations manager", "team manager"].includes(normalized) || normalized.includes("manager")) return "Manager";

  return "Admin";
}
