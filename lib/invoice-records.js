import { canAccess } from "./permissions.js";
import { calculateInvoice, defaultInvoiceBranchId, invoiceValidation, money } from "./invoice-model.js";
import { createInvoicePdf } from "./invoice-pdf.js";

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const currency = (value) => `INR ${money(value)}`;
export const invoiceSummarySelect = { id: true, vendor: true, invoiceNo: true, attendance: true, amount: true, tds: true, status: true, tone: true, createdAt: true, updatedAt: true };
const documentSelect = { id: true, invoiceId: true, kind: true, fileName: true, mimeType: true, size: true, createdAt: true, updatedAt: true };
const invoiceSelect = {
  id: true, vendor: true, invoiceNo: true, attendance: true, amount: true, tds: true, status: true, tone: true,
  details: true, createdBy: true, updatedBy: true, createdAt: true, updatedAt: true, documents: { select: documentSelect }
};
const invoiceFields = ["branchId", "mode", "invoiceNo", "invoiceDate", "poNo", "poDate", "state", "copies", "tax", "tds", "received", "receivedAmount", "signatoryName", "roundOff", "paymentTerms", "deliveryTerms", "deliveryNote", "notes"];
const partyFields = ["id", "name", "gstin", "pan", "phone", "gstType", "state", "email", "billing", "shipping"];
const rowFields = ["id", "item", "hsn", "description", "details", "qty", "unit", "price", "tax"];
const pick = (value, fields) => Object.fromEntries(fields.filter((key) => value?.[key] !== undefined).map((key) => [key, value[key]]));
const attachmentMimeTypes = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", txt: "text/plain" };

function invoiceObject(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(400, `${label} must be an object.`);
  const result = pick(value, fields);
  for (const [key, item] of Object.entries(result)) {
    if (key === "received" || key === "roundOff") {
      if (typeof item !== "boolean") fail(400, `Invalid ${label} field: ${key}.`);
    } else {
      if (!["string", "number"].includes(typeof item)) fail(400, `Invalid ${label} field: ${key}.`);
      result[key] = String(item);
    }
  }
  return result;
}

export function requireInvoiceAccess(user) {
  if (!user?.email) fail(401, "Please sign in to access invoices.");
  if (!canAccess(user.role, "/invoices")) fail(403, "You do not have access to Invoice.");
}

export function invoiceRecordToTransaction(row) {
  const { details, ...record } = row;
  return {
    ...details, ...record,
    date: details?.date || row.attendance || "",
    party: row.vendor || details?.party || "",
    transaction: details?.transaction || "Sale",
    paymentType: details?.paymentType || "Credit",
    balance: details?.balance || row.amount,
    pdfUrl: details?.invoiceData ? `/api/invoices/${encodeURIComponent(row.id)}/pdf` : "",
    documents: (row.documents || []).map((document) => ({ ...document, fileUrl: document.kind === "Invoice PDF" ? `/api/invoices/${encodeURIComponent(row.id)}/pdf` : `/api/invoices/${encodeURIComponent(row.id)}/documents/${encodeURIComponent(document.id)}` }))
  };
}

export async function listInvoices(db, user) {
  requireInvoiceAccess(user);
  return (await db.invoice.findMany({ orderBy: { createdAt: "desc" }, select: invoiceSelect })).map(invoiceRecordToTransaction);
}

export async function getInvoice(db, user, id) {
  requireInvoiceAccess(user);
  const row = await db.invoice.findUnique({ where: { id }, select: invoiceSelect });
  if (!row) fail(404, "Invoice not found.");
  return invoiceRecordToTransaction(row);
}

function decodeAttachments(attachments, existing = []) {
  if (attachments === undefined) return { keep: existing.filter((document) => document.kind !== "Invoice PDF").map((document) => document.id), files: [] };
  if (!Array.isArray(attachments) || attachments.length > 20) fail(400, "An invoice can have up to 20 attachments.");
  const files = [], keep = [];
  let totalSize = 0;
  for (const attachment of attachments) {
    if (attachment.id) {
      const stored = existing.find((document) => document.id === attachment.id && document.kind !== "Invoice PDF");
      if (!stored) fail(400, "The attachment does not belong to this invoice.");
      keep.push(stored.id);
      totalSize += stored.size;
      continue;
    }
    const fileName = String(attachment.fileName || "").replace(/[\r\n\\/]/g, "-");
    if (!/\.(pdf|png|jpe?g|webp|docx?|xlsx?|csv|txt)$/i.test(fileName)) fail(400, "Use PDF, image, Word, Excel, CSV, or text attachments.");
    const encoded = String(attachment.data || "");
    if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) fail(400, "Invalid attachment data.");
    const data = Buffer.from(encoded, "base64");
    totalSize += data.length;
    const mimeType = attachmentMimeTypes[fileName.split(".").at(-1).toLowerCase()];
    files.push({ kind: "Attachment", fileName: fileName.slice(0, 200), mimeType, size: data.length, data });
  }
  if (totalSize > 10 * 1024 * 1024) fail(413, "Invoice attachments must total 10 MB or less.");
  return { keep, files };
}

export async function saveInvoice(db, user, payload, id) {
  requireInvoiceAccess(user);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail(400, "Invoice must be an object.");
  const previous = id ? await db.invoice.findUnique({ where: { id }, select: invoiceSelect }) : null;
  if (id && !previous) fail(404, "Invoice not found.");
  const raw = { ...previous?.details, ...payload };
  const invoiceNo = String(payload.invoiceNo ?? payload.invoiceData?.invoiceNo ?? previous?.invoiceNo ?? "").trim();
  if (!invoiceNo || invoiceNo.length > 100) fail(400, "Enter an invoice number of 100 characters or fewer.");
  const data = { invoiceNo, updatedBy: user.email, ...(!id ? { createdBy: user.email } : {}) };
  let pdf, attachments;
  if (raw.invoiceData) {
    const invoiceData = { ...invoiceObject(raw.invoiceData, invoiceFields, "Invoice"), invoiceNo };
    invoiceData.branchId ||= defaultInvoiceBranchId;
    const partyData = invoiceObject(raw.partyData, partyFields, "Customer");
    if (!Array.isArray(raw.rowsData) || raw.rowsData.length > 500) fail(400, "An invoice must contain between 1 and 500 items.");
    const rowsData = raw.rowsData.map((row, index) => ({ ...invoiceObject(row, rowFields, "Item"), id: String(row.id ?? index + 1) }));
    const error = invoiceValidation(invoiceData, partyData, rowsData);
    if (error) fail(400, error);
    const totals = calculateInvoice(invoiceData, rowsData, partyData);
    const paymentStatus = totals.received <= 0 ? "Unpaid" : totals.balance <= 0 ? "Paid" : "Part Paid";
    const status = ["Cancelled", "Returned", "Approved"].includes(payload.status) ? payload.status : paymentStatus;
    const balance = ["Cancelled", "Returned"].includes(status) ? 0 : totals.balance;
    const date = invoiceData.invoiceDate.split("-").reverse().join("/");
    Object.assign(data, {
      vendor: partyData.name.trim(), attendance: date, amount: currency(totals.grand), tds: invoiceData.tds || "NONE (0%)",
      status, tone: status === "Paid" || status === "Approved" ? "green" : status === "Part Paid" ? "gold" : "red",
      details: { invoiceData, partyData, rowsData, date, party: partyData.name.trim(), paymentType: invoiceData.mode, transaction: raw.transaction === "Sale Return" ? "Sale Return" : "Sale", balance: currency(balance) }
    });
    attachments = decodeAttachments(payload.attachments, previous?.documents);
    pdf = Buffer.from(await (await createInvoicePdf({ invoice: invoiceData, party: partyData, rows: rowsData })).arrayBuffer());
  } else {
    // Summary-only finance records remain editable until their full invoice is entered.
    const summary = { ...previous, ...payload };
    for (const field of ["vendor", "attendance", "amount", "status", "tone"]) {
      if (!String(summary[field] || "").trim()) fail(400, `${field} is required.`);
      data[field] = String(summary[field]);
    }
    data.tds = String(summary.tds || "NONE (0%)");
  }
  return db.$transaction(async (tx) => {
    if (id && payload.updatedAt && new Date(payload.updatedAt).getTime() !== new Date(previous.updatedAt).getTime()) fail(409, "This invoice was changed by another user. Refresh before saving.");
    if (id) {
      const changed = await tx.invoice.updateMany({ where: { id, updatedAt: previous.updatedAt }, data });
      if (!changed.count) fail(409, "This invoice was changed by another user. Refresh before saving.");
    }
    const saved = id ? { id } : await tx.invoice.create({ data });
    if (pdf) {
      const pdfDocument = previous?.documents.find((document) => document.kind === "Invoice PDF");
      const pdfData = { fileName: `tax-invoice-${invoiceNo.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`, mimeType: "application/pdf", size: pdf.length, data: pdf };
      if (pdfDocument) await tx.invoiceDocument.update({ where: { id: pdfDocument.id }, data: pdfData });
      else await tx.invoiceDocument.create({ data: { ...pdfData, invoiceId: saved.id, kind: "Invoice PDF" } });
      await tx.invoiceDocument.deleteMany({ where: { invoiceId: saved.id, kind: "Attachment", id: { notIn: attachments.keep } } });
      for (const attachment of attachments.files) await tx.invoiceDocument.create({ data: { ...attachment, invoiceId: saved.id } });
    }
    await tx.auditLog.create({ data: { actor: user.email, action: id ? "UPDATE" : "CREATE", entity: "Invoice", entityId: saved.id, detail: `${id ? "Updated" : "Created"} invoice ${invoiceNo} for ${data.vendor}` } });
    return invoiceRecordToTransaction(await tx.invoice.findUnique({ where: { id: saved.id }, select: invoiceSelect }));
  });
}

export async function deleteInvoice(db, user, id) {
  requireInvoiceAccess(user);
  return db.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { id }, select: { invoiceNo: true } });
    if (!existing) fail(404, "Invoice not found.");
    await tx.invoice.delete({ where: { id } });
    await tx.auditLog.create({ data: { actor: user.email, action: "DELETE", entity: "Invoice", entityId: id, detail: `Deleted invoice ${existing.invoiceNo}` } });
    return { id };
  });
}

export async function getInvoiceFile(db, user, invoiceId, documentId) {
  requireInvoiceAccess(user);
  const file = await db.invoiceDocument.findFirst({ where: { invoiceId, ...(documentId ? { id: documentId } : { kind: "Invoice PDF" }) } });
  if (!file) fail(404, "Invoice document not found. Save the complete invoice to create its PDF.");
  return file;
}

export async function listInvoiceDocuments(db, user) {
  requireInvoiceAccess(user);
  const files = await db.invoiceDocument.findMany({ orderBy: { updatedAt: "desc" }, select: { ...documentSelect, invoice: { select: { invoiceNo: true, vendor: true, createdBy: true } } } });
  return files.map((file) => ({
    id: `invoice-document-${file.id}`, invoiceId: file.invoiceId, documentId: file.id, invoiceNo: file.invoice.invoiceNo,
    owner: file.invoice.vendor, docType: file.kind === "Invoice PDF" ? `Tax Invoice ${file.invoice.invoiceNo}` : `${file.invoice.invoiceNo} - ${file.fileName}`,
    label: file.kind === "Invoice PDF" ? `Tax Invoice ${file.invoice.invoiceNo}` : file.fileName,
    module: "Invoice", expiry: "-", status: "Saved", tone: "teal", fileName: file.fileName, mimeType: file.mimeType,
    sizeLabel: `${Math.max(1, Math.ceil(file.size / 1024))} KB`, createdAt: file.createdAt, updatedAt: file.updatedAt, createdBy: file.invoice.createdBy,
    fileUrl: file.kind === "Invoice PDF" ? `/api/invoices/${encodeURIComponent(file.invoiceId)}/pdf` : `/api/invoices/${encodeURIComponent(file.invoiceId)}/documents/${encodeURIComponent(file.id)}`
  }));
}
