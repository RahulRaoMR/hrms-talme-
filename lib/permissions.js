export const rolePermissions = {
  "Enterprise Admin": ["*"],
  "Operations Manager": [
    "/dashboard",
    "/ats",
    "/hrms",
    "/vms",
    "/shifts",
    "/leaves",
    "/payroll",
    "/loans",
    "/approvals",
    "/reports",
    "/dynamic-reports",
    "/documents",
    "/settings",
    "/search",
    "/exports",
    "/employee-portal",
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
    "/reports",
    "/documents",
    "/search",
    "/exports",
    "/employee-portal",
    "/notifications",
    "/activity"
  ]
};

export function canAccess(role, href) {
  const permissions = rolePermissions[role] || [];
  return permissions.includes("*") || permissions.includes(href);
}

export function canAdmin(role) {
  return role === "Enterprise Admin";
}
