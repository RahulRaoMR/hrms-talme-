import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ||=
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "postgresql://user:password@localhost:5432/talme";

const result = spawnSync("npx", ["prisma", "generate"], {
  env: process.env,
  shell: true,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
