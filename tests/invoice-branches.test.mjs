import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { calculateInvoice, defaultInvoiceBranchId, getInvoiceCompany, invoiceBranches, invoiceCompany, invoiceValidation, meghaInvoiceParty } from "../lib/invoice-model.js";
import { createInvoicePdf } from "../lib/invoice-pdf.js";
import { getInvoice, getInvoiceFile, saveInvoice } from "../lib/invoice-records.js";
import { invoiceTestDatabase } from "./helpers/invoice-db.mjs";
import { invoicePdfText } from "./helpers/invoice-pdf.mjs";

const accounts = { email: "branches-accounts@example.test", role: "Accounts" };
const admin = { email: "branches-admin@example.test", role: "Super Admin" };
const invoice = { invoiceNo: "BRANCH-CHECK", invoiceDate: "2026-10-06", mode: "Credit", state: "Karnataka", tax: "GST@18%", tds: "NONE (0%)" };
const rows = [{ id: 1, item: "Contract staffing", hsn: "998513", description: "Service fee", qty: "1", price: "2110", tax: "Select", unit: "NONE" }];
const payload = (branchId) => ({ invoiceNo: invoice.invoiceNo, invoiceData: { ...invoice, ...(branchId ? { branchId } : {}) }, partyData: { ...meghaInvoiceParty }, rowsData: rows });

test("UB City remains the default and only the seller address changes between branches", () => {
  assert.equal(defaultInvoiceBranchId, "ub-city");
  assert.deepEqual(getInvoiceCompany(), invoiceCompany);
  assert.deepEqual(getInvoiceCompany("ub-city"), invoiceCompany);
  assert.deepEqual(getInvoiceCompany("banashankari"), {
    ...invoiceCompany,
    address: "285, 9th Main Road, 26th Cross BSK 2ND Stage,\nBengaluru 560070"
  });
  assert.deepEqual(calculateInvoice({ ...invoice, branchId: "banashankari" }, rows, meghaInvoiceParty), calculateInvoice(invoice, rows, meghaInvoiceParty));
  assert.equal(invoiceValidation(invoice, meghaInvoiceParty, rows), "");
  assert.match(invoiceValidation({ ...invoice, branchId: "unknown" }, meghaInvoiceParty, rows), /issuing branch/);
});

test("each branch PDF has its own address and retains all company, customer, and payment details", async () => {
  for (const branch of invoiceBranches) {
    const blob = await createInvoicePdf({ invoice: { ...invoice, branchId: branch.id }, party: meghaInvoiceParty, rows });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = await invoicePdfText(bytes);
    for (const line of branch.address.split("\n")) assert.ok(text.includes(line), `${branch.label}: ${line}`);
    assert.equal(text.includes(branch.id === "ub-city" ? "560070" : "560001"), false);
    for (const value of [invoiceCompany.gstin, invoiceCompany.cin, invoiceCompany.udyam, invoiceCompany.email, invoiceCompany.account, invoiceCompany.ifsc, meghaInvoiceParty.name, meghaInvoiceParty.gstin, "2,490.00", "379.80"]) {
      assert.ok(text.includes(value), `${branch.label}: retained ${value}`);
    }
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  }
  const legacy = await createInvoicePdf({ invoice, party: meghaInvoiceParty, rows });
  assert.ok((await invoicePdfText(new Uint8Array(await legacy.arrayBuffer()))).includes("UB City, Bangalore - 560001"));
});

test("legacy invoice saves default to UB City without changing its customer or totals", async () => {
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, accounts, payload());
  assert.equal(saved.invoiceData.branchId, defaultInvoiceBranchId);
  assert.deepEqual(saved.partyData, meghaInvoiceParty);
  assert.equal(saved.amount, "INR 2,490.00");
  assert.ok((await invoicePdfText((await getInvoiceFile(db, admin, saved.id)).data)).includes("560001"));
});

test("branch selection survives shared-account reads and changing branch regenerates the saved PDF", async () => {
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, accounts, { ...payload("banashankari"), attachments: [{ fileName: "supporting.txt", data: Buffer.from("Keep this document").toString("base64") }] });
  const reopened = await getInvoice(db, admin, saved.id);
  assert.equal(reopened.invoiceData.branchId, "banashankari");
  assert.ok((await invoicePdfText((await getInvoiceFile(db, admin, saved.id)).data)).includes("Bengaluru 560070"));
  const updated = await saveInvoice(db, admin, { ...reopened, invoiceData: { ...reopened.invoiceData, branchId: "ub-city" } }, saved.id);
  assert.equal((await getInvoice(db, accounts, saved.id)).invoiceData.branchId, "ub-city");
  const text = await invoicePdfText((await getInvoiceFile(db, accounts, saved.id)).data);
  assert.ok(text.includes("UB City, Bangalore - 560001"));
  assert.equal(text.includes("560070"), false);
  assert.equal(updated.amount, saved.amount);
  assert.deepEqual(updated.partyData, saved.partyData);
  assert.deepEqual(updated.rowsData, saved.rowsData);
  assert.deepEqual(updated.documents.map((document) => document.id), saved.documents.map((document) => document.id));
});

test("the backend rejects unknown or malformed branches before writing invoice data", async () => {
  const db = invoiceTestDatabase();
  for (const branchId of ["another-branch", {}, 123]) {
    await assert.rejects(saveInvoice(db, accounts, { ...payload(), invoiceData: { ...invoice, branchId } }), { status: 400 });
  }
  assert.equal(db.state.invoices.length, 0);
  assert.equal(db.state.documents.length, 0);
});
