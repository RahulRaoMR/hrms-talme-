"use client";

import { getSuiteSession } from "./auth-session.js";

async function invoiceResponse(path, options = {}) {
  const session = getSuiteSession();
  const signInError = () => Object.assign(new Error("Your sign-in is no longer valid. Sign in again to view the shared invoices."), { status: 401 });
  if (!session?.token) throw signInError();
  const response = await fetch(path, {
    ...options, cache: "no-store",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${session?.token || ""}`, ...options.headers }
  });
  if (!response.ok) {
    if (response.status === 401) throw signInError();
    const payload = await response.json().catch(() => ({}));
    throw Object.assign(new Error(payload.error || "Unable to load or save the invoice."), { status: response.status });
  }
  return response;
}

export async function invoiceRequest(path = "/api/invoices", options = {}) {
  return (await invoiceResponse(path, options)).json();
}

export function confirmSavedInvoice(record) {
  if (!record?.invoiceData || !record.partyData || !Array.isArray(record.rowsData) || !Array.isArray(record.documents) || !record.documents.some((document) => document.kind === "Invoice PDF")) {
    throw new Error("The invoice backend needs an update to save complete invoices and documents.");
  }
  return record;
}

export async function invoiceFile(path) {
  return (await invoiceResponse(path)).blob();
}

export function downloadInvoiceBlob(blobOrUrl, fileName) {
  const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (typeof blobOrUrl !== "string") window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function invoiceAttachment(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Invoice attachments must total 10 MB or less.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return { fileName: file.name, mimeType: file.type || "application/octet-stream", size: file.size, data: btoa(binary) };
}
