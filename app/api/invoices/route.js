import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export async function GET() {
  await ensureSeedData();
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(invoices);
}
