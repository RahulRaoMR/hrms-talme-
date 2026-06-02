CREATE TABLE "PunchActivity" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "workDate" TEXT NOT NULL,
    "geoCoordinates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PunchActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PunchActivity_employeeId_workDate_idx" ON "PunchActivity"("employeeId", "workDate");
CREATE INDEX "PunchActivity_timestamp_idx" ON "PunchActivity"("timestamp");
