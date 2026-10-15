import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import env from "@next/env";
import { requireInvoiceAccess, saveInvoice, getInvoice, listInvoices, listInvoiceDocuments, getInvoiceFile, deleteInvoice } from "../lib/invoice-records.js";
import { meghaInvoiceParty } from "../lib/invoice-model.js";
import { invoiceTestDatabase } from "./helpers/invoice-db.mjs";
import { canAccess, rolePermissions } from "../lib/permissions.js";

const accounts = { email: "invoice-storage-check@example.test", role: "Accounts" };
const admin = { email: "invoice-admin-check@example.test", role: "Super Admin" };
const denied = { email: "invoice-denied-check@example.test", role: "HR" };
const payload = () => ({
  invoiceNo: `INVOICE-CHECK-${crypto.randomUUID()}`,
  invoiceData: { invoiceDate: "2026-10-06", mode: "Credit", state: "Karnataka", tax: "GST@18%", tds: "NONE (0%)", received: false },
  partyData: { ...meghaInvoiceParty },
  rowsData: [{ id: 1, item: "Contract staffing", hsn: "998513", qty: "1", price: "2110", unit: "NONE", tax: "Select", description: "Complete invoice service description" }],
  amount: "1", createdBy: "forged@example.test", attachments: [{ fileName: "supporting-note.txt", mimeType: "text/html", data: Buffer.from("Supporting document").toString("base64") }]
});

test("invoice permissions include Invoice and Super Admin roles and reject missing or unauthorized users", () => {
  assert.doesNotThrow(() => requireInvoiceAccess(accounts));
  assert.doesNotThrow(() => requireInvoiceAccess(admin));
  assert.doesNotThrow(() => requireInvoiceAccess({ ...accounts, role: "Invoice" }));
  assert.throws(() => requireInvoiceAccess(null), { status: 401 });
  assert.throws(() => requireInvoiceAccess(denied), { status: 403 });
});

test("full invoice and files are shared across accounts, with server totals and trusted author", async () => {
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, accounts, payload());
  assert.equal(saved.amount, "INR 2,490.00");
  assert.equal(saved.createdBy, accounts.email);
  assert.equal(saved.documents.length, 2);
  assert.equal(saved.documents.some((file) => "data" in file), false);
  const seenByAdmin = await getInvoice(db, admin, saved.id);
  assert.deepEqual(seenByAdmin, saved);
  assert.equal((await listInvoices(db, admin))[0].id, saved.id);
  assert.equal((await listInvoiceDocuments(db, admin)).length, 2);
  const file = await getInvoiceFile(db, admin, saved.id);
  assert.equal(Buffer.from(file.data).subarray(0, 5).toString(), "%PDF-");
  const attachment = saved.documents.find((document) => document.kind === "Attachment");
  const stored = await getInvoiceFile(db, admin, saved.id, attachment.id);
  assert.equal(stored.mimeType, "text/plain");
  assert.equal(Buffer.from(stored.data).toString(), "Supporting document");
  await assert.rejects(getInvoiceFile(db, denied, saved.id), { status: 403 });
});

test("edits retain attachments, regenerate the PDF, and reject stale versions", async () => {
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, accounts, payload());
  const updated = await saveInvoice(db, admin, { ...saved, invoiceData: { ...saved.invoiceData, notes: "Updated by admin" } }, saved.id);
  assert.equal(updated.documents.length, 2);
  assert.equal(updated.updatedBy, admin.email);
  assert.equal(updated.invoiceData.notes, "Updated by admin");
  await assert.rejects(saveInvoice(db, accounts, { ...saved, invoiceData: { ...saved.invoiceData, notes: "Stale update" } }, saved.id), { status: 409 });
  assert.equal((await getInvoice(db, admin, saved.id)).invoiceData.notes, "Updated by admin");
  const removed = await saveInvoice(db, admin, { ...updated, attachments: [] }, saved.id);
  assert.equal(removed.documents.length, 1);
});

test("failed document writes roll back the whole invoice", async () => {
  const db = invoiceTestDatabase();
  db.failDocumentWrite = true;
  await assert.rejects(saveInvoice(db, accounts, payload()), /Document write failed/);
  assert.equal(db.state.invoices.length, 0);
  assert.equal(db.state.documents.length, 0);
  assert.equal(db.state.audit.length, 0);
});

test("another invoice's attachment cannot be attached or downloaded, and deleting removes its own files", async () => {
  const db = invoiceTestDatabase();
  const first = await saveInvoice(db, accounts, payload());
  const second = await saveInvoice(db, accounts, payload());
  const attachment = first.documents.find((document) => document.kind === "Attachment");
  await assert.rejects(saveInvoice(db, admin, { ...second, attachments: [{ id: attachment.id }] }, second.id), { status: 400 });
  await assert.rejects(getInvoiceFile(db, admin, second.id, attachment.id), { status: 404 });
  await deleteInvoice(db, admin, first.id);
  await assert.rejects(getInvoice(db, accounts, first.id), { status: 404 });
  assert.equal((await listInvoiceDocuments(db, accounts)).length, 2);
});

test("invalid invoice fields and files are rejected before persistence", async () => {
  const db = invoiceTestDatabase();
  await assert.rejects(saveInvoice(db, accounts, { ...payload(), partyData: { name: {} } }), { status: 400 });
  await assert.rejects(saveInvoice(db, accounts, { ...payload(), attachments: [{ fileName: "page.html", data: "YQ==" }] }), { status: 400 });
  await assert.rejects(saveInvoice(db, accounts, { ...payload(), attachments: [{ fileName: "note.txt", data: "bad base64" }] }), { status: 400 });
  assert.equal(db.state.invoices.length, 0);
});

test("PostgreSQL invoice/file transaction works across roles and rolls back all test data", { skip: process.env.INVOICE_STORAGE_DATABASE_TESTS !== "true" }, async () => {
  env.loadEnvConfig(process.cwd(), true);
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ log: [] });
  const invoice = payload();
  const rollback = new Error("ROLLBACK_INVOICE_CHECK");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const transactionalDb = { ...tx, $transaction: (action) => action(tx) };
      const saved = await saveInvoice(transactionalDb, accounts, invoice);
      const loaded = await getInvoice(tx, admin, saved.id);
      assert.equal(loaded.rowsData[0].description, invoice.rowsData[0].description);
      assert.equal(loaded.createdBy, accounts.email);
      assert.equal((await getInvoiceFile(tx, admin, saved.id)).size > 1000, true);
      assert.equal((await listInvoiceDocuments(tx, admin)).filter((file) => file.invoiceId === saved.id).length, 2);
      const updated = await saveInvoice(transactionalDb, admin, { ...saved, invoiceData: { ...saved.invoiceData, notes: "Database update check" } }, saved.id);
      assert.equal(updated.invoiceData.notes, "Database update check");
      await deleteInvoice(transactionalDb, admin, saved.id);
      assert.equal(await tx.invoiceDocument.count({ where: { invoiceId: saved.id } }), 0);
      throw rollback;
    }, { timeout: 30000 }), (error) => error === rollback);
    assert.equal(await db.invoice.count({ where: { invoiceNo: invoice.invoiceNo } }), 0);
  } finally { await db.$disconnect(); }
});

test("live invoice API permits authorized roles and rejects anonymous/unauthorized access", { skip: process.env.INVOICE_STORAGE_API_TESTS !== "true" }, async () => {
  env.loadEnvConfig(process.cwd(), true);
  const base = process.env.INVOICE_TEST_BASE_URL || "http://localhost:3000";
  const token = (user) => {
    const body = Buffer.from(JSON.stringify({ user, expiresAt: Date.now() + 60000 })).toString("base64url");
    return `${body}.${crypto.createHmac("sha256", process.env.AUTH_SECRET || "talme-dev-secret").update(body).digest("base64url")}`;
  };
  const request = (path, user) => fetch(`${base}${path}`, { headers: user ? { Authorization: `Bearer ${token(user)}` } : {}, signal: AbortSignal.timeout(30000) });
  assert.equal((await request("/api/invoices")).status, 401);
  assert.equal((await request("/api/invoices", denied)).status, 403);
  const first = await request("/api/invoices", accounts);
  const second = await request("/api/invoices", admin);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual((await first.json()).map((row) => row.id), (await second.json()).map((row) => row.id));
  assert.equal((await request("/api/invoice-documents", denied)).status, 403);
  assert.equal((await request("/api/invoice-documents", admin)).status, 200);

  const referenceInvoices = await (await request("/api/invoices", admin)).json();
  const referenceDocuments = await (await request("/api/invoice-documents", admin)).json();
  for (const role of [...Object.keys(rolePermissions), "Super Admin", "Admin", "Administrator", "Invoice", "Account", "Finance"]) {
    const user = { email: "invoice-access-check@example.test", role };
    const session = await request("/api/auth/session", user);
    assert.equal(session.status, 200, `${role}: session validation`);
    assert.equal((await session.json()).user.role, role);
    const response = await request("/api/invoices", user);
    assert.equal(response.status, canAccess(role, "/invoices") ? 200 : 403, `${role}: invoice access must match module permissions`);
    if (!response.ok) continue;
    assert.deepEqual((await response.json()).map((invoice) => invoice.id), referenceInvoices.map((invoice) => invoice.id), `${role}: must see the same invoice register`);
    const documents = await request("/api/invoice-documents", user);
    assert.equal(documents.status, 200, `${role}: document access`);
    assert.deepEqual((await documents.json()).map((document) => document.id), referenceDocuments.map((document) => document.id), `${role}: must see the same documents`);
    const full = referenceInvoices.find((invoice) => invoice.pdfUrl);
    if (full) assert.equal((await request(full.pdfUrl, user)).status, 200, `${role}: PDF download`);
  }
});
