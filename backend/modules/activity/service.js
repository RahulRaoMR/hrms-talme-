import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export async function getActivityFeed() {
  await ensureSeedData();

  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
}
