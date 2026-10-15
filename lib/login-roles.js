export function canonicalLoginRole(role) {
  const value = String(role || "").trim();
  const normalized = value.toLowerCase();
  if (["admin", "administrator", "super admin", "enterprise admin"].includes(normalized)) return "Enterprise Admin";
  if (["account", "accounts", "invoice", "finance"].includes(normalized)) return "Accounts";
  if (normalized === "employee") return "Employee";
  if (["employeehrms", "employee hrms"].includes(normalized)) return "Employee HRMS";
  return value;
}

export function normalizeLoginRole(role) {
  const roles = { admin: "Enterprise Admin", superAdmin: "Enterprise Admin", administrator: "Enterprise Admin", hr: "HR", payrollAts: "Payroll + ATS", ats: "ATS", invoice: "Accounts", accounts: "Accounts", employeeHrms: "Employee HRMS", payroll: "Payroll", employee: "Employee" };
  return Object.hasOwn(roles, role) ? roles[role] : canonicalLoginRole(role);
}

export function isEmployeeLoginRole(role) {
  return ["Employee", "Employee HRMS"].includes(normalizeLoginRole(role));
}

export function loginRolesMatch(assignedRole, requestedRole) {
  const expected = normalizeLoginRole(requestedRole);
  return !expected || canonicalLoginRole(assignedRole) === expected ||
    (isEmployeeLoginRole(assignedRole) && isEmployeeLoginRole(expected));
}
