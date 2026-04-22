"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

async function refreshSuite() {
  revalidatePath("/dashboard");
  revalidatePath("/ats");
  revalidatePath("/vms");
  revalidatePath("/payroll");
  revalidatePath("/users");
  revalidatePath("/activity");
}

async function writeAudit(action, entity, entityId, detail) {
  const session = await auth();

  await prisma.auditLog.create({
    data: {
      actor: session?.user?.email || "system",
      action,
      entity,
      entityId,
      detail
    }
  });
}

function normalizeCsvRows(rows, headers) {
  const normalizedHeaders = headers.map((header) => header.toLowerCase());

  return rows
    .map((row) => row.map((value) => String(value || "").trim()))
    .filter((row) => row.some(Boolean))
    .filter((row) => {
      const normalizedRow = row.map((value) => value.toLowerCase());
      return !normalizedHeaders.every((header, index) => normalizedRow[index] === header);
    });
}

export async function createCandidateAction(payload) {
  await ensureSeedData();

  const candidate = await prisma.candidate.create({
    data: {
      name: payload.name,
      role: payload.role,
      stage: payload.stage,
      source: payload.source,
      status: payload.status || "New",
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "Candidate", candidate.id, `Created candidate ${candidate.name}`);
  await refreshSuite();
  return candidate;
}

export async function importCandidatesAction(rows) {
  await ensureSeedData();

  const data = normalizeCsvRows(rows, ["Name", "Role", "Stage", "Source", "Status"])
    .filter(([name, role]) => name && role)
    .map(([name, role, stage = "Imported", source = "Direct ATS", status = "Imported"]) => ({
      name,
      role,
      stage,
      source,
      status,
      tone: status === "Approved" ? "teal" : "gold"
    }));

  if (data.length) {
    await prisma.candidate.createMany({ data });
  }

  await writeAudit("IMPORT", "Candidate", null, `Imported ${data.length} candidates`);
  await refreshSuite();
  return { count: data.length };
}

export async function updateCandidateAction(id, payload) {
  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      name: payload.name,
      role: payload.role,
      stage: payload.stage,
      source: payload.source,
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "Candidate", candidate.id, `Updated candidate ${candidate.name}`);
  await refreshSuite();
  return candidate;
}

export async function approveCandidateAction(id) {
  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      status: "Approved",
      tone: "teal"
    }
  });

  await writeAudit("APPROVE", "Candidate", id, `Approved candidate ${candidate.name}`);
  await refreshSuite();
  return candidate;
}

export async function deleteCandidateAction(id) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  await prisma.candidate.delete({
    where: { id }
  });

  await writeAudit("DELETE", "Candidate", id, `Deleted candidate ${candidate?.name || id}`);
  await refreshSuite();
  return { id };
}

export async function bulkDeleteCandidatesAction(ids) {
  await prisma.candidate.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });

  await writeAudit("BULK_DELETE", "Candidate", null, `Deleted ${ids.length} candidates`);
  await refreshSuite();
  return { ids };
}

export async function createVendorAction(payload) {
  await ensureSeedData();

  const vendor = await prisma.vendor.create({
    data: {
      vendor: payload.vendor,
      category: payload.category,
      sites: Number(payload.sites),
      rating: Number(payload.rating),
      status: payload.status || "New",
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "Vendor", vendor.id, `Created vendor ${vendor.vendor}`);
  await refreshSuite();
  return vendor;
}

export async function importVendorsAction(rows) {
  await ensureSeedData();

  const data = normalizeCsvRows(rows, ["Vendor", "Category", "Sites", "Rating", "Status"])
    .filter(([vendor, category]) => vendor && category)
    .map(([vendor, category, sites = "1", rating = "4.0", status = "Imported"]) => ({
      vendor,
      category,
      sites: Number(sites) || 1,
      rating: Number(rating) || 4,
      status,
      tone: status === "Active" || status === "Approved" ? "teal" : "gold"
    }));

  if (data.length) {
    await prisma.vendor.createMany({ data });
  }

  await writeAudit("IMPORT", "Vendor", null, `Imported ${data.length} vendors`);
  await refreshSuite();
  return { count: data.length };
}

export async function updateVendorAction(id, payload) {
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      vendor: payload.vendor,
      category: payload.category,
      sites: Number(payload.sites),
      rating: Number(payload.rating),
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "Vendor", vendor.id, `Updated vendor ${vendor.vendor}`);
  await refreshSuite();
  return vendor;
}

export async function approveVendorAction(id) {
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      status: "Approved",
      tone: "teal"
    }
  });

  await writeAudit("APPROVE", "Vendor", id, `Approved vendor ${vendor.vendor}`);
  await refreshSuite();
  return vendor;
}

export async function deleteVendorAction(id) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  await prisma.vendor.delete({
    where: { id }
  });

  await writeAudit("DELETE", "Vendor", id, `Deleted vendor ${vendor?.vendor || id}`);
  await refreshSuite();
  return { id };
}

export async function bulkDeleteVendorsAction(ids) {
  await prisma.vendor.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });

  await writeAudit("BULK_DELETE", "Vendor", null, `Deleted ${ids.length} vendors`);
  await refreshSuite();
  return { ids };
}

export async function createInvoiceAction(payload) {
  await ensureSeedData();

  const invoice = await prisma.invoice.create({
    data: {
      vendor: payload.vendor,
      invoiceNo: payload.invoiceNo,
      attendance: payload.attendance,
      amount: payload.amount,
      status: payload.status || "Queued",
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "Invoice", invoice.id, `Created invoice ${invoice.invoiceNo}`);
  await refreshSuite();
  return invoice;
}

export async function importInvoicesAction(rows) {
  await ensureSeedData();

  const data = normalizeCsvRows(rows, ["Vendor", "Invoice No.", "Attendance", "Amount", "Status"])
    .filter(([vendor, invoiceNo]) => vendor && invoiceNo)
    .map(([vendor, invoiceNo, attendance = "Pending lock", amount = "INR 0", status = "Queued"]) => ({
      vendor,
      invoiceNo,
      attendance,
      amount,
      status,
      tone: status === "Approved" ? "teal" : "gold"
    }));

  for (const invoice of data) {
    await prisma.invoice.upsert({
      where: { invoiceNo: invoice.invoiceNo },
      update: invoice,
      create: invoice
    });
  }

  await writeAudit("IMPORT", "Invoice", null, `Imported ${data.length} invoices`);
  await refreshSuite();
  return { count: data.length };
}

export async function updateInvoiceAction(id, payload) {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      vendor: payload.vendor,
      invoiceNo: payload.invoiceNo,
      attendance: payload.attendance,
      amount: payload.amount,
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "Invoice", invoice.id, `Updated invoice ${invoice.invoiceNo}`);
  await refreshSuite();
  return invoice;
}

export async function approveInvoiceAction(id) {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: "Approved",
      tone: "teal"
    }
  });

  await writeAudit("APPROVE", "Invoice", id, `Approved invoice ${invoice.invoiceNo}`);
  await refreshSuite();
  return invoice;
}

export async function deleteInvoiceAction(id) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  await prisma.invoice.delete({
    where: { id }
  });

  await writeAudit("DELETE", "Invoice", id, `Deleted invoice ${invoice?.invoiceNo || id}`);
  await refreshSuite();
  return { id };
}

export async function bulkDeleteInvoicesAction(ids) {
  await prisma.invoice.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });

  await writeAudit("BULK_DELETE", "Invoice", null, `Deleted ${ids.length} invoices`);
  await refreshSuite();
  return { ids };
}

export async function createUserAction(payload) {
  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      active: payload.active ?? true,
      passwordHash: await bcrypt.hash(payload.password || "talme123", 10)
    }
  });

  await writeAudit("CREATE", "User", user.id, `Created user ${user.email}`);
  await refreshSuite();
  return {
    ...user,
    passwordHash: undefined
  };
}

export async function updateUserAction(id, payload) {
  const data = {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    active: payload.active
  };

  if (payload.password) {
    data.passwordHash = await bcrypt.hash(payload.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data
  });

  await writeAudit("UPDATE", "User", user.id, `Updated user ${user.email}`);
  await refreshSuite();
  return {
    ...user,
    passwordHash: undefined
  };
}

export async function deleteUserAction(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  await prisma.user.delete({
    where: { id }
  });

  await writeAudit("DELETE", "User", id, `Deleted user ${user?.email || id}`);
  await refreshSuite();
  return { id };
}
