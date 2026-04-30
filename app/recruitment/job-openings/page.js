import JobOpeningsPageClient from "@/components/pages/job-openings-page";
import { requireAuth } from "@/lib/require-auth";
import { getJobOpenings, getRecruiters } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function JobOpeningsPage() {
  await requireAuth("/recruitment/job-openings");
  const [jobOpenings, recruiters] = await Promise.all([getJobOpenings(), getRecruiters()]);
  return (
    <JobOpeningsPageClient
      data={JSON.parse(JSON.stringify({ jobOpenings, recruiters }))}
    />
  );
}
