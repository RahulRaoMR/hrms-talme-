import { notFound } from "next/navigation";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { findFrontendRecord } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { getPersistentResource } from "@/lib/prisma-store";

const candidateDetailFields = [
  ["Job ID", "jobId"],
  ["Recruiter ID", "recruiterId"],
  ["Recruiter Name", "recruiterName"],
  ["Candidate Name", "name"],
  ["Position", "role"],
  ["Stage", "stage"],
  ["Candidate Current Status", "status"],
  ["Source", "source"],
  ["Business Unit", "businessUnit"],
  ["Domain", "domain"],
  ["Client", "client"],
  ["Notice Period", "noticePeriod"],
  ["Candidate Email", "email"],
  ["Phone No.", "phone"],
  ["Qualification", "qualification"],
  ["Years of Exp", "yearsOfExperience"],
  ["Previous Company", "previousCompany"],
  ["Previous CTC", "previousCtc"],
  ["Location", "location"],
  ["Preferred Location", "preferredLocation"],
  ["Expected CTC", "expectedCtc"],
  ["Source Date", "sourceDate"],
  ["Screening Date", "screeningDate"],
  ["Screening Notes", "screeningNotes"],
  ["Tech 1 Date", "tech1Date"],
  ["Tech 1 Status", "tech1Status"],
  ["Tech 1 Remarks", "tech1Remarks"],
  ["Tech 1 Panel", "tech1Panel"],
  ["Tech 2 Date", "tech2Date"],
  ["Tech 2 Status", "tech2Status"],
  ["Tech 2 Remarks", "tech2Remarks"],
  ["Tech 2 Panel", "tech2Panel"],
  ["Tech 3 Date", "tech3Date"],
  ["Tech 3 Status", "tech3Status"],
  ["Tech 3 Remarks", "tech3Remarks"],
  ["Tech 3 Panel", "tech3Panel"],
  ["Offer Stage Input Date", "offerStageInputDate"],
  ["Document Collection Date", "documentCollectionDate"],
  ["Approval Date", "approvalDate"],
  ["Offer Date", "offerDate"],
  ["Offer Status", "offerStatus"],
  ["Offer Accept/Reject Date", "offerDecisionDate"],
  ["Offer Accept Status", "offerAcceptStatus"],
  ["Date Of Joining", "joiningDate"],
  ["Joining Status", "joiningStatus"],
  ["CTC Offered", "offeredCtc"]
];

function formatCandidateDetail(candidate, key) {
  const value = candidate?.[key];
  if (value === null || value === undefined || value === "") return "-";
  return key === "yearsOfExperience" ? `${value} years` : value;
}

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }) {
  const { id } = await params;
  const candidate =
    (await getPersistentResource("candidates", id)) ||
    getResource("candidates")?.find((item) => String(item.id) === String(id)) ||
    findFrontendRecord("candidate", id);

  if (!candidate) notFound();

  return (
    <RecordDetailPage
      eyebrow="Candidate Detail"
      title={candidate.name}
      brandEyebrow="ATS Suite"
      primaryHref="/ats"
      primaryLabel="Back To ATS"
      summary={`${candidate.name} is currently in ${candidate.stage} for the ${candidate.role} pipeline at ${candidate.client || "the assigned client"}.`}
      details={candidateDetailFields
        .slice(0, 16)
        .map(([label, key]) => [label, formatCandidateDetail(candidate, key)])}
      sections={[
        {
          title: "Candidate Compensation",
          items: candidateDetailFields
            .slice(16, 21)
            .map(([label, key]) => ({ label, value: formatCandidateDetail(candidate, key) }))
        },
        {
          title: "Interview Timeline",
          items: candidateDetailFields
            .slice(21, 36)
            .map(([label, key]) => ({ label, value: formatCandidateDetail(candidate, key) }))
        },
        {
          title: "Offer and Joining",
          items: candidateDetailFields
            .slice(36)
            .map(([label, key]) => ({ label, value: formatCandidateDetail(candidate, key) }))
        }
      ]}
    />
  );
}
