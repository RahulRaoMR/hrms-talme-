CREATE TABLE "InvoiceParty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "phone" TEXT,
    "gstType" TEXT,
    "state" TEXT,
    "email" TEXT,
    "billing" TEXT,
    "shipping" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceParty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceParty_gstin_key" ON "InvoiceParty"("gstin");
CREATE INDEX "InvoiceParty_name_idx" ON "InvoiceParty"("name");
CREATE INDEX "InvoiceParty_phone_idx" ON "InvoiceParty"("phone");
