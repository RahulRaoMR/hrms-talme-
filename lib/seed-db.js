import bcrypt from "bcryptjs";
import {
  approvalSeed,
  attendanceSeed,
  demoSeed,
  documentSeed,
  employeeMasterSeed,
  leaveSeed,
  notificationSeed,
  settingSeed,
  uploadedAssetSeed,
  vendorWorkerSeed
} from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export async function ensureSeedData() {
  const [
    userCount,
    candidateCount,
    vendorCount,
    invoiceCount,
    employeeCount,
    leaveCount,
    attendanceCount,
    vendorWorkerCount,
    documentCount,
    approvalCount,
    settingCount,
    uploadedAssetCount,
    notificationCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.vendor.count(),
    prisma.invoice.count(),
    prisma.employee.count(),
    prisma.leaveRequest.count(),
    prisma.attendanceRecord.count(),
    prisma.vendorWorker.count(),
    prisma.documentRecord.count(),
    prisma.approvalItem.count(),
    prisma.companySetting.count(),
    prisma.uploadedAsset.count(),
    prisma.notification.count()
  ]);

  if (userCount === 0) {
    await prisma.user.create({
      data: {
        name: "Talme Director",
        email: "director@talme.ai",
        role: "Enterprise Admin",
        active: true,
        passwordHash: await bcrypt.hash("talme123", 10)
      }
    });
  }

  if (candidateCount === 0) {
    await prisma.candidate.createMany({
      data: demoSeed.candidates.map((candidate) => ({
        name: candidate.name,
        role: candidate.role,
        stage: candidate.stage,
        source: candidate.source,
        status: candidate.label,
        tone: candidate.tone
      }))
    });
  }

  if (vendorCount === 0) {
    await prisma.vendor.createMany({
      data: demoSeed.vendors.map((vendor) => ({
        vendor: vendor.vendor,
        category: vendor.category,
        sites: Number(vendor.sites),
        rating: Number(vendor.rating),
        status: vendor.label,
        tone: vendor.tone
      }))
    });
  }

  if (invoiceCount === 0) {
    await prisma.invoice.createMany({
      data: demoSeed.invoices.map((invoice) => ({
        vendor: invoice.vendor,
        invoiceNo: invoice.invoiceNo,
        attendance: invoice.attendance,
        amount: invoice.amount,
        status: invoice.label,
        tone: invoice.tone
      }))
    });
  }

  if (employeeCount === 0) {
    await prisma.employee.createMany({ data: employeeMasterSeed });
  }

  if (leaveCount === 0) {
    await prisma.leaveRequest.createMany({ data: leaveSeed });
  }

  if (attendanceCount === 0) {
    await prisma.attendanceRecord.createMany({ data: attendanceSeed });
  }

  if (vendorWorkerCount === 0) {
    await prisma.vendorWorker.createMany({ data: vendorWorkerSeed });
  }

  if (documentCount === 0) {
    await prisma.documentRecord.createMany({ data: documentSeed });
  }

  if (approvalCount === 0) {
    await prisma.approvalItem.createMany({ data: approvalSeed });
  }

  if (settingCount === 0) {
    await prisma.companySetting.createMany({ data: settingSeed });
  }

  if (uploadedAssetCount === 0) {
    await prisma.uploadedAsset.createMany({ data: uploadedAssetSeed });
  }

  if (notificationCount === 0) {
    await prisma.notification.createMany({ data: notificationSeed });
  }
}
