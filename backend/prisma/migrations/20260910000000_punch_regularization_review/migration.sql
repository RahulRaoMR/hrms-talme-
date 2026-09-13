ALTER TABLE "PunchActivity"
ADD COLUMN "regularizationReviewedBy" TEXT,
ADD COLUMN "regularizationReviewedAt" TIMESTAMP(3),
ADD COLUMN "regularizationDeclineReason" TEXT;
