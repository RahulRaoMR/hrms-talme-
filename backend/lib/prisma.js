import { PrismaClient } from "@prisma/client";

const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//;
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const postgresUrl =
  [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL_NON_POOLING]
    .find((value) => POSTGRES_URL_PATTERN.test(String(value || "").replace(/^"|"$/g, "")));

export const hasPostgresDatabase = Boolean(postgresUrl);

if (postgresUrl) {
  process.env.DATABASE_URL = postgresUrl.replace(/^"|"$/g, "");
} else if (databaseUrl) {
  console.warn("DATABASE_URL must be a PostgreSQL URL. Falling back to demo data until a valid PostgreSQL DATABASE_URL is configured.");
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
