import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export async function GET() {
  await ensureSeedData();

  const activity = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json(activity);
}
