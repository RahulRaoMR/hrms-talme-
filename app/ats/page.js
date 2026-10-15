import AtsPageClient from "@/components/pages/ats-page";
import { getJobOpenings, getFrontendCandidates } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AtsPage() {
  let jobOpenings = [];
  let candidates = [];
  let loadError = "";

  try {
    jobOpenings =
      (await fetchServerApiJson("/api/job-openings")) ||
      (await listPersistentResource("job-openings", { fallbackOnError: false })) ||
      getResource("job-openings") ||
      getJobOpenings();
    candidates =
      (await fetchServerApiJson("/api/candidates")) ||
      (await listPersistentResource("candidates", { fallbackOnError: false })) ||
      getResource("candidates") ||
      getFrontendCandidates();
  } catch (error) {
    loadError = error?.status ? error.message : "Unable to load saved recruitment records. Please try again shortly.";
  }

  return <AtsPageClient data={JSON.parse(JSON.stringify({ jobOpenings, candidates, loadError }))} />;
}
