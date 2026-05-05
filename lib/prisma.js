import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ||=
  process.env.NODE_ENV === "production" ? "file:/tmp/talme-hrms/dev.db" : "file:./dev.db";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
