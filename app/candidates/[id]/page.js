import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { findFrontendRecord } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }) {
  const { id } = await params;
  const candidate = findFrontendRecord("candidate", id);
  if (!candidate) notFound();

  return (
    <RecordDetailPage
      eyebrow="Candidate Detail"
      title={candidate.name}
      brandEyebrow="ATS Suite"
      primaryHref="/ats"
      primaryLabel="Back To ATS"
      summary={`${candidate.name} is currently in ${candidate.stage} for the ${candidate.role} pipeline at ${candidate.client || "the assigned client"}.`}
      details={[
        ["Job ID", candidate.jobId],
        ["Role", candidate.role],
        ["Client", candidate.client],
        ["Recruiter", candidate.recruiterName],
        ["Phone", candidate.phone],
        ["Email", candidate.email],
        ["Stage", candidate.stage],
        ["Source", candidate.source],
        ["Status", candidate.status],
        ["Experience", candidate.yearsOfExperience ? `${candidate.yearsOfExperience} years` : "-"],
        ["Expected CTC", candidate.expectedCtc],
        ["Offered CTC", candidate.offeredCtc || "-"]
      ]}
      sections={[
        {
          title: "Recruitment Signals",
          items: [
            { label: "Current Stage", value: candidate.stage },
            { label: "Sourcing Channel", value: candidate.source },
            { label: "Decision Status", value: candidate.status },
            { label: "Preferred Location", value: candidate.preferredLocation || "-" },
            { label: "Joining Status", value: candidate.joiningStatus || "-" }
          ]
        },
        {
          title: "Interview Timeline",
          items: [
            { label: "Source Date", value: candidate.sourceDate || "-" },
            { label: "Screening Date", value: candidate.screeningDate || "-" },
            { label: "Tech 1", value: candidate.tech1Status || "-" },
            { label: "Tech 2", value: candidate.tech2Status || "-" },
            { label: "Tech 3", value: candidate.tech3Status || "-" },
            { label: "Offer Status", value: candidate.offerStatus || "-" }
          ]
        }
      ]}
    />
  );
}
