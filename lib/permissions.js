export const rolePermissions = {
  "Enterprise Admin": ["*"],
  "Operations Manager": ["/dashboard", "/ats", "/hrms", "/vms", "/payroll", "/notifications", "/activity", "/shifts", "/leaves", "/approvals", "/loans", "/reports", "/dynamic-reports", "/settings"],
  "Finance Approver": ["/dashboard", "/payroll", "/vms", "/notifications", "/activity", "/loans", "/reports"],
  "Recruiter": ["/dashboard", "/ats", "/hrms", "/notifications", "/activity", "/reports"]
};

export function canAccess(role, href) {
  const permissions = rolePermissions[role] || [];
  return permissions.includes("*") || permissions.includes(href);
}

export function canAdmin(role) {
  return role === "Enterprise Admin";
}
