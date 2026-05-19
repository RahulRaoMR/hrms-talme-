CREATE TABLE "DailyUpdate" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "authorRole" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DailyUpdate_authorEmail_idx" ON "DailyUpdate"("authorEmail");
CREATE INDEX "DailyUpdate_createdAt_idx" ON "DailyUpdate"("createdAt");
