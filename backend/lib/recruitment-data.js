import { readFileSync } from "node:fs";
import path from "node:path";

function loadJson(name) {
  const filePath = path.join(process.cwd(), "data", "recruitment", `${name}.json`);

  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
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

export function getRecruitmentSeedData() {
  return {
    jobOpenings: uniqueBy(loadJson("job-openings"), "jobId"),
    candidates: loadJson("candidates"),
    recruiters: uniqueBy(loadJson("recruiters"), "recruiterId"),
    harmonizedRoles: uniqueBy(loadJson("harmonized-roles"), "position"),
    performanceReview: loadJson("performance-review")
  };
}
