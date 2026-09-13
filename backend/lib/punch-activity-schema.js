export const punchActivityRegularizationMigrationMessage =
  "Punch regularization database columns are missing. Run the pending Prisma migrations to add PunchActivity.reason and PunchActivity.regularizationStatus.";

export function isMissingPunchActivityRegularizationColumn(error) {
  const message = String(error?.message || "");

  return (
    error?.code === "P2022" ||
    /PunchActivity\.(reason|regularizationStatus)/i.test(message) ||
    /column .*PunchActivity.*(reason|regularizationStatus).*does not exist/i.test(message) ||
    /column .*(reason|regularizationStatus).* does not exist/i.test(message)
  );
}
