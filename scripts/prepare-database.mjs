import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.env.DATABASE_URL ||=
  process.env.NODE_ENV === "production" ? "file:/tmp/talme-hrms/dev.db" : "file:./dev.db";

if (process.env.DATABASE_URL.startsWith("file:")) {
  const databasePath = process.env.DATABASE_URL.slice("file:".length).split("?")[0];

  if (databasePath.startsWith("/")) {
    mkdirSync(dirname(databasePath), { recursive: true });
  } else if (!databasePath.startsWith(".")) {
    mkdirSync(dirname(fileURLToPath(`file:///${databasePath}`)), { recursive: true });
  }
}

const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  env: process.env,
  shell: true,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
