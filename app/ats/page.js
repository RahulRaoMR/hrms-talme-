import AtsPageClient from "@/components/pages/ats-page";
import { getJobOpenings } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AtsPage() {
  let jobOpenings = [];

  try {
    jobOpenings =
      (await listPersistentResource("job-openings")) ||
      (await fetchServerApiJson("/api/job-openings")) ||
      getResource("job-openings") ||
      getJobOpenings();
  } catch {
    jobOpenings = getJobOpenings();
  }

  return <AtsPageClient data={JSON.parse(JSON.stringify({ jobOpenings }))} />;
}
