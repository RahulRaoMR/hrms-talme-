import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { amountInWords, calculateInvoice, invoiceValidation, meghaInvoiceParty } from "../lib/invoice-model.js";
import { createInvoicePdf } from "../lib/invoice-pdf.js";

const invoice = { invoiceNo: "053TTPL2627", invoiceDate: "2026-10-06", tax: "GST@18%", state: "Karnataka", tds: "NONE (0%)" };
const rows = [{ item: "Contract staffing", hsn: "998513", description: "Incentive for employees TT_1 & TT_4, service fee @6%", qty: "1", price: "2110", tax: "Select", unit: "NONE" }];

test("Megha reference totals and tax words retain paise", () => {
  const result = calculateInvoice(invoice, rows, meghaInvoiceParty);
  assert.equal(result.subtotal, 2110);
  assert.equal(result.cgst, 189.9);
  assert.equal(result.sgst, 189.9);
  assert.equal(result.tax, 379.8);
  assert.equal(result.roundOff, 0.2);
  assert.equal(result.grand, 2490);
  assert.equal(result.balance, 2490);
  assert.equal(amountInWords(result.tax), "INR Rupees Three Hundred Seventy Nine and Eighty Paise Only");
});

test("row overrides, exemption, and mixed HSN/rates agree with the summary", () => {
  const result = calculateInvoice(invoice, [rows[0], { ...rows[0], hsn: "998519", price: "100", tax: "GST@5%" }, { ...rows[0], price: "200", tax: "NONE" }]);
  assert.equal(result.tax, 384.8);
  assert.equal(result.groups.length, 3);
  assert.equal(result.items[2].taxAmount, 0);
  assert.equal(result.groups.reduce((sum, group) => sum + group.tax, 0), result.tax);
});

test("place of supply switches automatic GST to IGST", () => {
  const result = calculateInvoice({ ...invoice, state: "Maharashtra" }, rows);
  assert.equal(result.igst, 379.8);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
});

test("TDS affects net payable and partial balance without reducing the invoice total", () => {
  const result = calculateInvoice({ ...invoice, tds: "2%", received: true, receivedAmount: "1000", roundOff: false }, rows);
  assert.equal(result.grand, 2489.8);
  assert.equal(result.tds, 42.2);
  assert.equal(result.payable, 2447.6);
  assert.equal(result.balance, 1447.6);
});

test("invalid amounts and missing invoice data cannot be downloaded or saved", () => {
  assert.equal(invoiceValidation(invoice, meghaInvoiceParty, rows), "");
  assert.match(invoiceValidation(invoice, meghaInvoiceParty, [{ ...rows[0], qty: "0" }]), /quantity/);
  assert.match(invoiceValidation(invoice, meghaInvoiceParty, [{ ...rows[0], price: "abc" }]), /rate/);
  assert.match(invoiceValidation(invoice, { ...meghaInvoiceParty, gstin: "BAD" }, rows), /GSTIN/);
  assert.match(invoiceValidation({ ...invoice, received: true, receivedAmount: "3000" }, meghaInvoiceParty, rows), /Received amount/);
});

test("PDF supports a single reference invoice and paginates all long service rows", async () => {
  const referenceBlob = await createInvoicePdf({ invoice, party: meghaInvoiceParty, rows });
  const reference = await PDFDocument.load(await referenceBlob.arrayBuffer());
  assert.equal(reference.getPageCount(), 1);
  const manyRows = Array.from({ length: 25 }, (_, i) => ({ ...rows[0], item: `Service ${i + 1}`, description: "Full service description with all details retained. ".repeat(18) }));
  const blob = await createInvoicePdf({ invoice, party: meghaInvoiceParty, rows: manyRows });
  const document = await PDFDocument.load(await blob.arrayBuffer());
  assert.ok(document.getPageCount() > 2);
  assert.equal(document.getPages().every((page) => page.getWidth() === 595.28), true);
});
