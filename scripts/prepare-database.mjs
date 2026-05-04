import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ||= "file:./dev.db";

const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  env: process.env,
  shell: true,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
