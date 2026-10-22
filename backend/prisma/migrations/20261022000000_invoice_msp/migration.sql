ALTER TABLE "Invoice"
  ADD COLUMN "mspApplicable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mspType" TEXT,
  ADD COLUMN "mspRate" DECIMAL(7,4),
  ADD COLUMN "mspAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "mspChannel" VARCHAR(200),
  ADD COLUMN "mspTreatment" TEXT NOT NULL DEFAULT 'DEDUCTION',
  ADD COLUMN "mspTax" TEXT NOT NULL DEFAULT 'NONE';

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_msp_check" CHECK (
  "mspAmount" >= 0
  AND "mspTreatment" IN ('DEDUCTION', 'FEE')
  AND (
    (NOT "mspApplicable" AND "mspAmount" = 0 AND "mspType" IS NULL AND "mspRate" IS NULL)
    OR ("mspApplicable" AND "mspType" IS NOT NULL AND (
      ("mspType" = 'PERCENTAGE' AND "mspRate" IS NOT NULL AND "mspRate" BETWEEN 0 AND 100)
      OR ("mspType" = 'FIXED' AND "mspRate" IS NULL)
    ))
  )
);
