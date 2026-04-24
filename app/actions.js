"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { deliverNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";
import { deleteUploadedFile } from "@/lib/storage";

async function refreshSuite() {
  revalidatePath("/dashboard");
  revalidatePath("/ats");
  revalidatePath("/vms");
  revalidatePath("/payroll");
  revalidatePath("/approvals");
  revalidatePath("/reports");
  revalidatePath("/documents");
  revalidatePath("/settings");
  revalidatePath("/employee-portal");
  revalidatePath("/vendor-portal");
  revalidatePath("/search");
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

export async function createEmployeeAction(payload) {
  const employee = await prisma.employee.create({
    data: {
      employeeId: payload.employeeId,
      name: payload.name,
      department: payload.department,
      location: payload.location,
      manager: payload.manager,
      grade: payload.grade,
      joiningDate: payload.joiningDate,
      salaryBand: payload.salaryBand,
      bankStatus: payload.bankStatus,
      status: payload.status,
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "Employee", employee.id, `Created employee ${employee.name}`);
  await refreshSuite();
  return employee;
}

export async function updateEmployeeAction(id, payload) {
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      employeeId: payload.employeeId,
      name: payload.name,
      department: payload.department,
      location: payload.location,
      manager: payload.manager,
      grade: payload.grade,
      joiningDate: payload.joiningDate,
      salaryBand: payload.salaryBand,
      bankStatus: payload.bankStatus,
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "Employee", employee.id, `Updated employee ${employee.name}`);
  await refreshSuite();
  return employee;
}

export async function deleteEmployeeAction(id) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  await prisma.employee.delete({ where: { id } });

  await writeAudit("DELETE", "Employee", id, `Deleted employee ${employee?.name || id}`);
  await refreshSuite();
  return { id };
}

export async function createLeaveRequestAction(payload) {
  const leave = await prisma.leaveRequest.create({
    data: {
      employee: payload.employee,
      leaveType: payload.leaveType,
      dates: payload.dates,
      balance: payload.balance,
      approver: payload.approver,
      status: payload.status,
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "LeaveRequest", leave.id, `Created leave request for ${leave.employee}`);
  await refreshSuite();
  return leave;
}

export async function updateLeaveRequestAction(id, payload) {
  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: {
      employee: payload.employee,
      leaveType: payload.leaveType,
      dates: payload.dates,
      balance: payload.balance,
      approver: payload.approver,
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "LeaveRequest", leave.id, `Updated leave request for ${leave.employee}`);
  await refreshSuite();
  return leave;
}

export async function deleteLeaveRequestAction(id) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  await prisma.leaveRequest.delete({ where: { id } });

  await writeAudit("DELETE", "LeaveRequest", id, `Deleted leave request for ${leave?.employee || id}`);
  await refreshSuite();
  return { id };
}

export async function createAttendanceRecordAction(payload) {
  const attendance = await prisma.attendanceRecord.create({
    data: {
      employee: payload.employee,
      present: Number(payload.present),
      leaves: Number(payload.leaves),
      overtime: Number(payload.overtime),
      shift: payload.shift,
      lockState: payload.lockState,
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "AttendanceRecord", attendance.id, `Created attendance row for ${attendance.employee}`);
  await refreshSuite();
  return attendance;
}

export async function updateAttendanceRecordAction(id, payload) {
  const attendance = await prisma.attendanceRecord.update({
    where: { id },
    data: {
      employee: payload.employee,
      present: Number(payload.present),
      leaves: Number(payload.leaves),
      overtime: Number(payload.overtime),
      shift: payload.shift,
      lockState: payload.lockState,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "AttendanceRecord", attendance.id, `Updated attendance row for ${attendance.employee}`);
  await refreshSuite();
  return attendance;
}

export async function deleteAttendanceRecordAction(id) {
  const attendance = await prisma.attendanceRecord.findUnique({ where: { id } });
  await prisma.attendanceRecord.delete({ where: { id } });

  await writeAudit("DELETE", "AttendanceRecord", id, `Deleted attendance row for ${attendance?.employee || id}`);
  await refreshSuite();
  return { id };
}

export async function createVendorWorkerAction(payload) {
  const worker = await prisma.vendorWorker.create({
    data: {
      workerId: payload.workerId,
      name: payload.name,
      vendor: payload.vendor,
      site: payload.site,
      skill: payload.skill,
      wageRate: payload.wageRate,
      attendance: payload.attendance,
      status: payload.status,
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "VendorWorker", worker.id, `Created vendor worker ${worker.name}`);
  await refreshSuite();
  return worker;
}

export async function updateVendorWorkerAction(id, payload) {
  const worker = await prisma.vendorWorker.update({
    where: { id },
    data: {
      workerId: payload.workerId,
      name: payload.name,
      vendor: payload.vendor,
      site: payload.site,
      skill: payload.skill,
      wageRate: payload.wageRate,
      attendance: payload.attendance,
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "VendorWorker", worker.id, `Updated vendor worker ${worker.name}`);
  await refreshSuite();
  return worker;
}

export async function deleteVendorWorkerAction(id) {
  const worker = await prisma.vendorWorker.findUnique({ where: { id } });
  await prisma.vendorWorker.delete({ where: { id } });

  await writeAudit("DELETE", "VendorWorker", id, `Deleted vendor worker ${worker?.name || id}`);
  await refreshSuite();
  return { id };
}

export async function createDocumentRecordAction(payload) {
  const document = await prisma.documentRecord.create({
    data: {
      owner: payload.owner,
      docType: payload.docType,
      module: payload.module,
      expiry: payload.expiry,
      status: payload.status,
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "DocumentRecord", document.id, `Created document ${document.docType}`);
  await refreshSuite();
  return document;
}

export async function updateDocumentRecordAction(id, payload) {
  const document = await prisma.documentRecord.update({
    where: { id },
    data: {
      owner: payload.owner,
      docType: payload.docType,
      module: payload.module,
      expiry: payload.expiry,
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "DocumentRecord", document.id, `Updated document ${document.docType}`);
  await refreshSuite();
  return document;
}

export async function deleteDocumentRecordAction(id) {
  const document = await prisma.documentRecord.findUnique({ where: { id } });
  await prisma.documentRecord.delete({ where: { id } });

  await writeAudit("DELETE", "DocumentRecord", id, `Deleted document ${document?.docType || id}`);
  await refreshSuite();
  return { id };
}

export async function createApprovalItemAction(payload) {
  const approval = await prisma.approvalItem.create({
    data: {
      module: payload.module,
      title: payload.title,
      owner: payload.owner,
      amount: payload.amount,
      level: payload.level,
      status: payload.status,
      tone: payload.tone || "gold"
    }
  });

  await writeAudit("CREATE", "ApprovalItem", approval.id, `Created approval ${approval.title}`);
  await refreshSuite();
  return approval;
}

export async function updateApprovalItemAction(id, payload) {
  const approval = await prisma.approvalItem.update({
    where: { id },
    data: {
      module: payload.module,
      title: payload.title,
      owner: payload.owner,
      amount: payload.amount,
      level: payload.level,
      status: payload.status,
      tone: payload.tone
    }
  });

  await writeAudit("UPDATE", "ApprovalItem", approval.id, `Updated approval ${approval.title}`);
  await refreshSuite();
  return approval;
}

export async function deleteApprovalItemAction(id) {
  const approval = await prisma.approvalItem.findUnique({ where: { id } });
  await prisma.approvalItem.delete({ where: { id } });

  await writeAudit("DELETE", "ApprovalItem", id, `Deleted approval ${approval?.title || id}`);
  await refreshSuite();
  return { id };
}

export async function createCompanySettingAction(payload) {
  const setting = await prisma.companySetting.create({
    data: {
      category: payload.category,
      name: payload.name,
      value: payload.value,
      status: payload.status
    }
  });

  await writeAudit("CREATE", "CompanySetting", setting.id, `Created setting ${setting.name}`);
  await refreshSuite();
  return setting;
}

export async function updateCompanySettingAction(id, payload) {
  const setting = await prisma.companySetting.update({
    where: { id },
    data: {
      category: payload.category,
      name: payload.name,
      value: payload.value,
      status: payload.status
    }
  });

  await writeAudit("UPDATE", "CompanySetting", setting.id, `Updated setting ${setting.name}`);
  await refreshSuite();
  return setting;
}

export async function deleteCompanySettingAction(id) {
  const setting = await prisma.companySetting.findUnique({ where: { id } });
  await prisma.companySetting.delete({ where: { id } });

  await writeAudit("DELETE", "CompanySetting", id, `Deleted setting ${setting?.name || id}`);
  await refreshSuite();
  return { id };
}

export async function createUploadedAssetRecordAction(payload) {
  const asset = await prisma.uploadedAsset.create({
    data: {
      module: payload.module,
      owner: payload.owner,
      label: payload.label,
      fileName: payload.fileName,
      fileUrl: payload.fileUrl,
      mimeType: payload.mimeType,
      sizeLabel: payload.sizeLabel,
      status: payload.status || "Uploaded"
    }
  });

  await writeAudit("CREATE", "UploadedAsset", asset.id, `Uploaded asset ${asset.fileName}`);
  await refreshSuite();
  return asset;
}

export async function deleteUploadedAssetAction(id) {
  const asset = await prisma.uploadedAsset.findUnique({ where: { id } });
  await deleteUploadedFile(asset?.fileUrl);
  await prisma.uploadedAsset.delete({ where: { id } });

  await writeAudit("DELETE", "UploadedAsset", id, `Deleted asset ${asset?.fileName || id}`);
  await refreshSuite();
  return { id };
}

export async function createNotificationAction(payload) {
  const notification = await prisma.notification.create({
    data: {
      subject: payload.subject,
      audience: payload.audience,
      recipients: payload.recipients,
      channel: payload.channel,
      message: payload.message,
      status: payload.status || "Draft",
      tone: payload.tone || "gold",
      providerResult: null,
      providerError: null
    }
  });

  await writeAudit("CREATE", "Notification", notification.id, `Created notification ${notification.subject}`);
  await refreshSuite();
  return notification;
}

export async function updateNotificationAction(id, payload) {
  const notification = await prisma.notification.update({
    where: { id },
    data: {
      subject: payload.subject,
      audience: payload.audience,
      recipients: payload.recipients,
      channel: payload.channel,
      message: payload.message,
      status: payload.status,
      tone: payload.tone,
      providerError: null
    }
  });

  await writeAudit("UPDATE", "Notification", notification.id, `Updated notification ${notification.subject}`);
  await refreshSuite();
  return notification;
}

export async function sendNotificationAction(id) {
  const current = await prisma.notification.findUnique({ where: { id } });
  const delivery = await deliverNotification(current);
  const notification = await prisma.notification.update({
    where: { id },
    data: {
      status: delivery.ok ? "Sent" : "Failed",
      tone: delivery.ok ? "teal" : "gold",
      providerResult: delivery.ok ? delivery.detail : null,
      providerError: delivery.ok ? null : delivery.detail
    }
  });

  await writeAudit("SEND", "Notification", notification.id, `Sent notification ${notification.subject}`);
  await refreshSuite();
  return notification;
}

export async function deleteNotificationAction(id) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  await prisma.notification.delete({ where: { id } });

  await writeAudit("DELETE", "Notification", id, `Deleted notification ${notification?.subject || id}`);
  await refreshSuite();
  return { id };
}
