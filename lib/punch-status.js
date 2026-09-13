export function isActivePunch(row = {}) {
  return !row.regularizationStatus || row.regularizationStatus === "Accepted";
}

export function canReviewPunches(user) {
  return ["CEO", "Enterprise Admin", "HR", "Payroll + ATS"].includes(user?.role);
}

export function attendancePunches(rows = []) {
  return rows.filter(isActivePunch).map(({ reason, regularizationStatus, regularizationReviewedBy, regularizationReviewedAt, regularizationDeclineReason, ...row }) => row);
}
