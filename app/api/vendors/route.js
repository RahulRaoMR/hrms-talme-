import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export async function GET() {
  await ensureSeedData();
  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(vendors);
}
