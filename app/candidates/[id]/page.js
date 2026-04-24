import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }) {
  await requireAuth("/ats");
  await ensureSeedData();
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) notFound();

  return (
    <RecordDetailPage
      eyebrow="Candidate Detail"
      title={candidate.name}
      brandEyebrow="ATS Suite"
      primaryHref="/ats"
      primaryLabel="Back To ATS"
      summary={`${candidate.name} is currently in ${candidate.stage} for the ${candidate.role} pipeline.`}
      details={[
        ["Role", candidate.role],
        ["Stage", candidate.stage],
        ["Source", candidate.source],
        ["Status", candidate.status],
        ["Tone", candidate.tone]
      ]}
      sections={[
        {
          title: "Recruitment Signals",
          items: [
            { label: "Current Stage", value: candidate.stage },
            { label: "Sourcing Channel", value: candidate.source },
            { label: "Decision Status", value: candidate.status }
          ]
        }
      ]}
    />
  );
}
