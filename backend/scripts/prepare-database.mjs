import { spawnSync } from "node:child_process";
import "../lib/load-env.js";
import dotenv from "dotenv";
import { applySqlMigrations } from "./apply-sql-migrations.mjs";

const { parsed: envFile = {} } = dotenv.config({ quiet: true });
const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//;

const cleanUrl = (value) => String(value || "").trim().replace(/^"|"$/g, "");
const toDirectDatabaseUrl = (value) => {
  try {
    const url = new URL(value);

    if (url.hostname.includes("-pooler")) {
      url.hostname = url.hostname.replace("-pooler", "");
    }

    return url.toString();
  } catch {
    return value;
  }
};

const databaseUrl = [
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL_NON_POOLING,
  envFile.DATABASE_URL,
  envFile.POSTGRES_URL,
  envFile.POSTGRES_PRISMA_URL,
  envFile.POSTGRES_URL_NON_POOLING
]
  .map(cleanUrl)
  .find((value) => POSTGRES_URL_PATTERN.test(value));

if (!databaseUrl) {
  console.error("DATABASE_URL must be a PostgreSQL URL starting with postgresql:// or postgres://.");
  process.exit(1);
}

const migrationUrl =
  [
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    envFile.DIRECT_URL,
    envFile.POSTGRES_URL_NON_POOLING
  ]
    .map(cleanUrl)
    .find((value) => POSTGRES_URL_PATTERN.test(value)) || toDirectDatabaseUrl(databaseUrl);

process.env.DATABASE_URL = migrationUrl;

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  env: process.env,
  shell: true,
  stdio: "inherit"
});

if ((result.status ?? 1) === 0) {
  process.exit(0);
}

console.warn("Prisma migrate failed; applying checked-in SQL migrations with pg fallback.");

try {
  await applySqlMigrations(migrationUrl);
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
