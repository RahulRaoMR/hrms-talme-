CREATE TABLE "EmployeeMobileSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "credentialHash" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "previousTokenHash" TEXT,
  "rotation" INTEGER NOT NULL DEFAULT 0,
  "rotatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "EmployeeMobileSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeMobileSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmployeeMobileSession_refreshTokenHash_key" ON "EmployeeMobileSession"("refreshTokenHash");
CREATE INDEX "EmployeeMobileSession_userId_revokedAt_idx" ON "EmployeeMobileSession"("userId", "revokedAt");
CREATE INDEX "EmployeeMobileSession_expiresAt_idx" ON "EmployeeMobileSession"("expiresAt");
