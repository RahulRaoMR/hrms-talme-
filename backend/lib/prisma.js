import "./load-env.js";
import { PrismaPg } from "@prisma/adapter-pg";
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
const prismaOptions = {
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy" }),
  log: ["error"]
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
