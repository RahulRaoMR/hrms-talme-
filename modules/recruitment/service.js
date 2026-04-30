import { getCandidates, getJobOpenings, getRecruiters } from "@/lib/query-data";

export async function getRecruitmentModuleData() {
  const [jobOpenings, recruiters, candidatePage] = await Promise.all([
    getJobOpenings(),
    getRecruiters(),
    getCandidates({})
  ]);

  return {
    jobOpenings,
    recruiters,
    candidates: candidatePage.items,
    candidateTotal: candidatePage.total
  };
}
