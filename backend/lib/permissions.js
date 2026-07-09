export const rolePermissions = {
  "Enterprise Admin": ["*"],
  Accounts: [
    "/invoices"
  ],
  "Payroll + ATS": [
    "/payroll",
    "/ats",
    "/candidates",
    "/recruitment",
    "/hrms",
    "/employees",
    "/shifts",
    "/leaves",
    "/documents"
  ],
  ATS: [
    "/ats",
    "/candidates",
    "/recruitment"
  ],
  Invoice: [
    "/invoices"
  ],
  Employee: [
    "/dashboard",
    "/ats",
    "/hrms",
    "/vms",
    "/invoices",
    "/shifts",
    "/leaves",
    "/payroll",
    "/daily-updates",
    "/loans",
    "/timesheet",
    "/performance-ratings",
    "/recruitment",
    "/recruitment/job-openings",
    "/recruitment/candidates",
    "/recruitment/hiring-tracker",
    "/recruitment/interviews",
    "/recruitment/offers",
    "/approvals",
    "/reports",
    "/dynamic-reports",
    "/documents",
    "/settings",
    "/employee-portal",
    "/employee-app",
    "/vendor-portal",
    "/search",
    "/exports",
    "/notifications",
    "/users",
    "/activity"
  ],
  HR: [
    "/dashboard",
    "/ats",
    "/hrms",
    "/shifts",
    "/leaves",
    "/timesheet",
    "/daily-updates",
    "/performance-ratings",
    "/recruitment",
    "/recruitment/job-openings",
    "/recruitment/candidates",
    "/recruitment/hiring-tracker",
    "/recruitment/interviews",
    "/recruitment/offers",
    "/approvals",
    "/reports",
    "/dynamic-reports",
    "/documents",
    "/settings",
    "/search",
    "/exports",
    "/employee-portal",
    "/notifications",
    "/activity"
  ],
  "Employee HRMS": [
    "/dashboard",
    "/hrms",
    "/leaves",
    "/timesheet",
    "/daily-updates",
    "/documents",
    "/employee-portal",
    "/employee-app",
    "/search",
    "/notifications",
    "/activity"
  ],
  Payroll: [
    "/payroll"
  ],
  "Operations Manager": [
    "/dashboard",
    "/ats",
    "/hrms",
    "/vms",
    "/shifts",
    "/leaves",
    "/payroll",
    "/daily-updates",
    "/loans",
    "/timesheet",
    "/performance-ratings",
    "/recruitment",
    "/recruitment/job-openings",
    "/recruitment/candidates",
    "/recruitment/hiring-tracker",
    "/recruitment/interviews",
    "/recruitment/offers",
    "/approvals",
    "/reports",
    "/dynamic-reports",
    "/documents",
    "/settings",
    "/search",
    "/exports",
    "/employee-portal",
    "/employee-app",
    "/vendor-portal",
    "/notifications",
    "/activity"
  ],
  "Finance Approver": [
    "/dashboard",
    "/vms",
    "/payroll",
    "/daily-updates",
    "/loans",
    "/performance-ratings",
    "/approvals",
    "/reports",
    "/documents",
    "/search",
    "/exports",
    "/vendor-portal",
    "/notifications",
    "/activity"
  ],
  Recruiter: [
    "/dashboard",
    "/ats",
    "/hrms",
    "/recruitment",
    "/daily-updates",
    "/recruitment/job-openings",
    "/recruitment/candidates",
    "/recruitment/hiring-tracker",
    "/recruitment/interviews",
    "/recruitment/offers",
    "/reports",
    "/documents",
    "/search",
    "/exports",
    "/employee-portal",
    "/employee-app",
    "/performance-ratings",
    "/notifications",
    "/activity"
  ]
};

const roleAliases = {
  Admin: "Enterprise Admin",
  Administrator: "Enterprise Admin",
  "Super Admin": "Enterprise Admin",
  Invoice: "Accounts",
  Account: "Accounts",
  Accounts: "Accounts",
  Finance: "Accounts"
};

export function resolveRole(role) {
  const directRole = String(role || "").trim();
  const aliasedRole = roleAliases[directRole] || directRole;
  return rolePermissions[aliasedRole] ? aliasedRole : null;
}

export function canAccess(role, href) {
  const resolvedRole = resolveRole(role);
  const permissions = resolvedRole ? rolePermissions[resolvedRole] : [];
  return permissions.includes("*") || permissions.some((permission) => pathMatches(permission, href));
}

export function canAdmin(role) {
  return resolveRole(role) === "Enterprise Admin";
}

export function defaultPathForRole(role) {
  const resolvedRole = resolveRole(role);
  if (resolvedRole === "Employee") return "/employee-app";
  const permissions = resolvedRole ? rolePermissions[resolvedRole] : [];
  return permissions.find((permission) => permission !== "*") || "/dashboard";
}

function pathMatches(permission, href) {
  return href === permission || href.startsWith(`${permission}/`);
}
