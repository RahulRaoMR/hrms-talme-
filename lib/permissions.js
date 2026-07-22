export const rolePermissions = {
  CEO: ["*"],
  "Enterprise Admin": ["*"],
  Accounts: [
    "/dashboard",
    "/invoices",
    "/daily-updates",
    "/timesheet",
    "/performance-ratings",
    "/documents",
    "/employee-portal",
    "/employee-app",
    "/notifications",
    "/activity"
  ],
  "Payroll + ATS": [
    "/dashboard",
    "/hrms",
    "/ats",
    "/invoices",
    "/shifts",
    "/leaves",
    "/daily-updates",
    "/letters",
    "/timesheet",
    "/performance-ratings",
    "/documents",
    "/loans",
    "/settings",
    "/employee-portal",
    "/employee-app",
    "/vendor-portal",
    "/search",
    "/notifications",
    "/activity"
  ],
  ATS: [
    "/dashboard",
    "/ats",
    "/daily-updates",
    "/timesheet",
    "/performance-ratings",
    "/documents",
    "/employee-portal",
    "/employee-app",
    "/search",
    "/notifications",
    "/activity"
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
    "/letters",
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
    "/letters",
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
    "/letters",
    "/documents",
    "/employee-portal",
    "/employee-app",
    "/search",
    "/notifications",
    "/activity"
  ],
  Payroll: [
    "/dashboard",
    "/payroll"
  ],
  Manager: [
    "/dashboard",
    "/hrms",
    "/shifts",
    "/leaves",
    "/timesheet",
    "/daily-updates",
    "/performance-ratings",
    "/approvals",
    "/reports",
    "/dynamic-reports",
    "/documents",
    "/search",
    "/exports",
    "/notifications",
    "/activity"
  ],
  "Operations Manager": [
    "/dashboard",
    "/ats",
    "/hrms",
    "/vms",
    "/invoices",
    "/shifts",
    "/leaves",
    "/payroll",
    "/daily-updates",
    "/letters",
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
    "/invoices",
    "/payroll",
    "/daily-updates",
    "/letters",
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
    "/letters",
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
