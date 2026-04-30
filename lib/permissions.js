export const rolePermissions = {
  "Enterprise Admin": ["*"],
  Employee: [
    "/employee-app"
  ],
  "Operations Manager": [
    "/dashboard",
    "/ats",
    "/hrms",
    "/vms",
    "/shifts",
    "/leaves",
    "/payroll",
    "/loans",
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
    "/loans",
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
    "/notifications",
    "/activity"
  ]
};

export function resolveRole(role) {
  return rolePermissions[role] ? role : null;
}

export function canAccess(role, href) {
  const resolvedRole = resolveRole(role);
  const permissions = resolvedRole ? rolePermissions[resolvedRole] : [];
  return permissions.includes("*") || permissions.includes(href);
}

export function canAdmin(role) {
  return resolveRole(role) === "Enterprise Admin";
}

export function defaultPathForRole(role) {
  return resolveRole(role) === "Employee" ? "/employee-app" : "/dashboard";
}
