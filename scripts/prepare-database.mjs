import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ||=
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add your PostgreSQL connection string in Render environment variables.");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  env: process.env,
  shell: true,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
