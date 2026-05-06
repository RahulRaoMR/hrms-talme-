ALTER TABLE "Employee" ADD COLUMN "salaryNetPay" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "AttendanceRecord" ADD COLUMN "salaryNetPay" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AttendanceRecord" ADD COLUMN "month" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AttendanceRecord" ADD COLUMN "monthDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AttendanceRecord" ADD COLUMN "sundays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AttendanceRecord" ADD COLUMN "holidays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AttendanceRecord" ADD COLUMN "paidLeaves" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AttendanceRecord" ADD COLUMN "otHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "AttendanceRecord"
SET
  "paidLeaves" = "leaves",
  "otHours" = "overtime"
WHERE "paidLeaves" = 0 AND "otHours" = 0;
