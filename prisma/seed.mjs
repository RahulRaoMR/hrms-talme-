import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  approvalSeed,
  attendanceSeed,
  documentSeed,
  employeeMasterSeed,
  leaveSeed,
  notificationSeed,
  settingSeed,
  uploadedAssetSeed,
  vendorWorkerSeed
} from "../lib/demo-data.js";

const prisma = new PrismaClient();

const candidates = [
  ["Neha Sharma", "HRBP", "Final Interview", "Direct ATS", "Pending", "gold"],
  ["Arjun Menon", "Security Lead", "Offer", "Staffing Vendor", "Approved", "teal"],
  ["Sonal Rao", "Payroll Analyst", "Assessment", "Referral", "Review", "slate"]
];

const vendors = [
  ["StaffCore India", "Staffing", 8, 4.8, "Active", "teal"],
  ["MoveFleet Logistics", "Transport", 3, 4.5, "Review", "gold"],
  ["FreshServe Foods", "Canteen", 5, 4.6, "Active", "teal"],
  ["SecureAxis Services", "Security", 4, 4.7, "Active", "teal"]
];

const invoices = [
  ["StaffCore India", "INV-4388", "March closed", "INR 42,40,000", "Approved", "teal"],
  ["SecureAxis Services", "INV-1293", "March closed", "INR 18,70,000", "Finance Review", "gold"],
  ["MoveFleet Logistics", "INV-9902", "March closed", "INR 9,25,000", "Pending Docs", "slate"]
];

async function main() {
  await prisma.user.upsert({
    where: { email: "director@talme.ai" },
    update: {
      active: true,
      role: "Enterprise Admin"
    },
    create: {
      name: "Talme Director",
      email: "director@talme.ai",
      role: "Enterprise Admin",
      passwordHash: await bcrypt.hash("talme123", 10)
    }
  });

  for (const [name, role, stage, source, status, tone] of candidates) {
    const existing = await prisma.candidate.findFirst({ where: { name, role } });
    if (!existing) {
      await prisma.candidate.create({ data: { name, role, stage, source, status, tone } });
    }
  }

  for (const [vendor, category, sites, rating, status, tone] of vendors) {
    const existing = await prisma.vendor.findFirst({ where: { vendor, category } });
    if (!existing) {
      await prisma.vendor.create({ data: { vendor, category, sites, rating, status, tone } });
    }
  }

  for (const [vendor, invoiceNo, attendance, amount, status, tone] of invoices) {
    await prisma.invoice.upsert({
      where: { invoiceNo },
      update: {},
      create: { vendor, invoiceNo, attendance, amount, status, tone }
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: "system",
      action: "SEED",
      entity: "Database",
      detail: "Seeded Talme HRMS demo database"
    }
  });

  for (const employee of employeeMasterSeed) {
    await prisma.employee.upsert({
      where: { employeeId: employee.employeeId },
      update: {},
      create: employee
    });
  }

  if ((await prisma.leaveRequest.count()) === 0) {
    await prisma.leaveRequest.createMany({ data: leaveSeed });
  }

  if ((await prisma.attendanceRecord.count()) === 0) {
    await prisma.attendanceRecord.createMany({ data: attendanceSeed });
  }

  for (const worker of vendorWorkerSeed) {
    await prisma.vendorWorker.upsert({
      where: { workerId: worker.workerId },
      update: {},
      create: worker
    });
  }

  if ((await prisma.documentRecord.count()) === 0) {
    await prisma.documentRecord.createMany({ data: documentSeed });
  }

  if ((await prisma.approvalItem.count()) === 0) {
    await prisma.approvalItem.createMany({ data: approvalSeed });
  }

  if ((await prisma.companySetting.count()) === 0) {
    await prisma.companySetting.createMany({ data: settingSeed });
  }

  if ((await prisma.uploadedAsset.count()) === 0) {
    await prisma.uploadedAsset.createMany({ data: uploadedAssetSeed });
  }

  if ((await prisma.notification.count()) === 0) {
    await prisma.notification.createMany({ data: notificationSeed });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
