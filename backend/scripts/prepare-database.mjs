import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const { parsed: envFile = {} } = dotenv.config({ quiet: true });
const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//;

const cleanUrl = (value) => String(value || "").trim().replace(/^"|"$/g, "");

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

process.env.DATABASE_URL = databaseUrl;

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  env: process.env,
  shell: true,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
