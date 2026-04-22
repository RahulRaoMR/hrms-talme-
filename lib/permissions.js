export const rolePermissions = {
  "Enterprise Admin": ["*"],
  "Operations Manager": ["/dashboard", "/ats", "/hrms", "/vms", "/payroll", "/notifications", "/activity"],
  "Finance Approver": ["/dashboard", "/payroll", "/vms", "/notifications", "/activity"],
  "Recruiter": ["/dashboard", "/ats", "/hrms", "/notifications", "/activity"]
};

export function canAccess(role, href) {
  const permissions = rolePermissions[role] || [];
  return permissions.includes("*") || permissions.includes(href);
}

export function canAdmin(role) {
  return role === "Enterprise Admin";
}
