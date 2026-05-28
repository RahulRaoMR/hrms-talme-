import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function loadJson(name) {
  const filePath = path.join(process.cwd(), "data", "recruitment", `${name}.json`);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function uniqueBy(items, key) {
  const seen = new Set();

  return items.filter((item) => {
    const value = item?.[key];

    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

async function main() {
  const recruitmentSeed = {
    jobOpenings: uniqueBy(loadJson("job-openings"), "jobId"),
    candidates: loadJson("candidates"),
    recruiters: uniqueBy(loadJson("recruiters"), "recruiterId"),
    harmonizedRoles: uniqueBy(loadJson("harmonized-roles"), "position")
  };

  if (!recruitmentSeed.candidates.length) {
    throw new Error("No recruitment seed data found. Run `npm run recruitment:extract` first.");
  }

  await prisma.$transaction([
    prisma.candidate.deleteMany(),
    prisma.jobOpening.deleteMany(),
    prisma.recruiter.deleteMany(),
    prisma.harmonizedRole.deleteMany()
  ]);

  await prisma.harmonizedRole.createMany({
    data: recruitmentSeed.harmonizedRoles
  });

  await prisma.recruiter.createMany({
    data: recruitmentSeed.recruiters
  });

  await prisma.jobOpening.createMany({
    data: recruitmentSeed.jobOpenings
  });

  await prisma.candidate.createMany({
    data: recruitmentSeed.candidates
  });

  console.log(
    JSON.stringify(
      {
        jobOpenings: recruitmentSeed.jobOpenings.length,
        candidates: recruitmentSeed.candidates.length,
        recruiters: recruitmentSeed.recruiters.length,
        harmonizedRoles: recruitmentSeed.harmonizedRoles.length
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
