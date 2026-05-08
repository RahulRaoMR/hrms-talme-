import JobOpeningsPageClient from "@/components/pages/job-openings-page";
import { getJobOpenings, getRecruiters } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function JobOpeningsPage() {
  const [jobOpenings, recruiters] = await Promise.all([getJobOpenings(), getRecruiters()]);
  return (
    <JobOpeningsPageClient
      data={JSON.parse(JSON.stringify({ jobOpenings, recruiters }))}
    />
  );
}
