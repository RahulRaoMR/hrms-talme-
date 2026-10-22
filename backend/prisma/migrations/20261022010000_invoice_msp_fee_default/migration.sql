-- New invoices add MSP as a platform/service fee. Preserve all stored settings.
ALTER TABLE "Invoice" ALTER COLUMN "mspTreatment" SET DEFAULT 'FEE';
