export function canReviewPunches(user) {
  return ["CEO", "Enterprise Admin", "HR", "Payroll + ATS"].includes(user?.role);
}

export function attendancePunches(rows = []) {
  return rows
    .filter((row) => !row.regularizationStatus || row.regularizationStatus === "Accepted")
    .map(({
      reason,
      regularizationStatus,
      regularizationReviewedBy,
      regularizationReviewedAt,
      regularizationDeclineReason,
      ...row
    }) => row);
}
