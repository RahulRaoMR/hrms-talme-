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
import { getRecruitmentPrisma, safeCount, safeCreateMany } from "@/lib/recruitment-prisma";
import { getRecruitmentSeedData } from "@/lib/recruitment-data";

export async function ensureSeedData() {
  const recruitmentSeed = getRecruitmentSeedData();
  const recruitmentPrisma = getRecruitmentPrisma();
  const [
    userCount,
    jobOpeningCount,
    candidateCount,
    recruiterCount,
    harmonizedRoleCount,
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
    safeCount(recruitmentPrisma.jobOpening),
    prisma.candidate.count(),
    safeCount(recruitmentPrisma.recruiter),
    safeCount(recruitmentPrisma.harmonizedRole),
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
    const candidateData = recruitmentSeed.candidates.length
      ? recruitmentSeed.candidates
      : demoSeed.candidates.map((candidate) => ({
          name: candidate.name,
          role: candidate.role,
          stage: candidate.stage,
          source: candidate.source,
          email: candidate.email,
          status: candidate.label,
          tone: candidate.tone
        }));

    await prisma.candidate.createMany({
      data: candidateData
    });
  }

  if (jobOpeningCount === 0 && recruitmentSeed.jobOpenings.length) {
    await safeCreateMany(recruitmentPrisma.jobOpening, {
      data: recruitmentSeed.jobOpenings
    });
  }

  if (recruiterCount === 0 && recruitmentSeed.recruiters.length) {
    await safeCreateMany(recruitmentPrisma.recruiter, {
      data: recruitmentSeed.recruiters
    });
  }

  if (harmonizedRoleCount === 0 && recruitmentSeed.harmonizedRoles.length) {
    await safeCreateMany(recruitmentPrisma.harmonizedRole, {
      data: recruitmentSeed.harmonizedRoles
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
