ALTER TABLE "Invoice"
  ADD COLUMN "details" JSONB,
  ADD COLUMN "createdBy" TEXT,
  ADD COLUMN "updatedBy" TEXT;

CREATE TABLE "InvoiceDocument" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceDocument_invoiceId_idx" ON "InvoiceDocument"("invoiceId");
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
