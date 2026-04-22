import bcrypt from "bcryptjs";
import { demoSeed } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export async function ensureSeedData() {
  const [userCount, candidateCount, vendorCount, invoiceCount] = await Promise.all([
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.vendor.count(),
    prisma.invoice.count()
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
}
