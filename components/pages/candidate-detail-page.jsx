"use client";

import { useEffect, useMemo, useState } from "react";
import RecordDetailPage from "@/components/pages/record-detail-page";
import { storeKeys } from "@/lib/demo-data";

const selectedCandidateKey = "talme-selected-candidate";

const candidateFields = [
  ["Candidate ID", "id"],
  ["Name", "name"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Role", "role"],
  ["Job ID", "jobId"],
  ["Recruiter ID", "recruiterId"],
  ["Recruiter", "recruiterName"],
  ["Business Unit", "businessUnit"],
  ["Department", "department"],
  ["Domain", "domain"],
  ["Client", "client"],
  ["Stage", "stage"],
  ["Source", "source"],
  ["Decision Status", "status"],
  ["Label", "label"],
  ["Tone", "tone"],
  ["Notice Period", "noticePeriod"],
  ["Qualification", "qualification"],
  ["Experience", "yearsOfExperience"],
  ["Previous Company", "previousCompany"],
  ["Previous CTC", "previousCtc"],
  ["Expected CTC", "expectedCtc"],
  ["Location", "location"],
  ["Preferred Location", "preferredLocation"],
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
  ["Offer Decision Date", "offerDecisionDate"],
  ["Offer Accept Status", "offerAcceptStatus"],
  ["Offered CTC", "offeredCtc"],
  ["Joining Date", "joiningDate"],
  ["Joining Status", "joiningStatus"],
  ["Resume File", "resumeFileName"],
  ["Created At", "createdAt"],
  ["Updated At", "updatedAt"]
];
const hiddenCandidateFieldKeys = new Set(["resumeMimeType", "resumeDataUrl"]);
const knownCandidateFieldKeys = new Set([
  ...candidateFields.map(([, key]) => key),
  ...hiddenCandidateFieldKeys
]);

function formatValue(value, label) {
  if (value === null || value === undefined || value === "") return "-";
  if (label === "Experience" && !String(value).includes("year")) return `${value} years`;
  return String(value);
}

function fieldItems(candidate, fields) {
  return fields.map(([label, key]) => ({
    label,
    value: formatValue(candidate?.[key], label)
  }));
}

function extraFieldItems(candidate) {
  return Object.entries(candidate || {})
    .filter(([key, value]) => !knownCandidateFieldKeys.has(key) && value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (letter) => letter.toUpperCase()),
      value: formatValue(value, key)
    }));
}

function readJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function findBrowserCandidate(id) {
  const selectedCandidate = readJson(window.sessionStorage.getItem(selectedCandidateKey));

  if (String(selectedCandidate?.id || "") === String(id)) {
    return selectedCandidate;
  }

  const storedCandidates = readJson(window.localStorage.getItem(storeKeys.candidates));
  if (!Array.isArray(storedCandidates)) return null;

  return storedCandidates.find((candidate) => String(candidate.id) === String(id)) || null;
}

export function rememberCandidateForDetail(candidate) {
  try {
    window.sessionStorage.setItem(selectedCandidateKey, JSON.stringify(candidate));
  } catch {}
}

function downloadCandidateResume(candidate) {
  if (!candidate?.resumeDataUrl) return;

  const link = document.createElement("a");
  link.href = candidate.resumeDataUrl;
  link.download = candidate.resumeFileName || `${candidate.name || "candidate"}-resume`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function CandidateDetailPageClient({ id, initialCandidate = null }) {
  const [candidate, setCandidate] = useState(initialCandidate);
  const [checkedBrowserStore, setCheckedBrowserStore] = useState(Boolean(initialCandidate));

  useEffect(() => {
    if (candidate) return;

    const browserCandidate = findBrowserCandidate(id);
    if (browserCandidate) {
      setCandidate(browserCandidate);
    }
    setCheckedBrowserStore(true);
  }, [candidate, id]);

  const pageData = useMemo(() => {
    if (!candidate) return null;

    const sections = [
        {
          eyebrow: "Candidate Data",
          title: "Profile And Source",
          items: fieldItems(candidate, candidateFields.slice(17, 25))
        },
        {
          eyebrow: "Candidate Data",
          title: "Sourcing And Screening",
          items: fieldItems(candidate, candidateFields.slice(25, 28))
        },
        {
          eyebrow: "Candidate Data",
          title: "Interview Timeline",
          items: fieldItems(candidate, candidateFields.slice(28, 40))
        },
        {
          eyebrow: "Candidate Data",
          title: "Offer And Joining",
          items: fieldItems(candidate, candidateFields.slice(40, 50))
        },
        {
          eyebrow: "Record Data",
          title: "System Fields",
          items: fieldItems(candidate, candidateFields.slice(50))
        }
      ];
    const extraItems = extraFieldItems(candidate);

    if (extraItems.length) {
      sections.push({
        eyebrow: "Record Data",
        title: "Additional Fields",
        items: extraItems
      });
    }

    return {
      details: fieldItems(candidate, candidateFields.slice(0, 17)).map((item) => [item.label, item.value]),
      sections
    };
  }, [candidate]);

  if (!candidate) {
    return (
      <RecordDetailPage
        eyebrow="Candidate Detail"
        title={checkedBrowserStore ? "Candidate Not Found" : "Loading Candidate"}
        brandEyebrow="ATS Suite"
        primaryHref="/ats"
        primaryLabel="Back To ATS"
        summary={
          checkedBrowserStore
            ? "This candidate is not available in the current API or browser shortlist store."
            : "Loading the candidate record from the current shortlist data."
        }
        details={[["Candidate ID", id]]}
      />
    );
  }

  return (
    <RecordDetailPage
      eyebrow="Candidate Detail"
      title={candidate.name || "Candidate Detail"}
      brandEyebrow="ATS Suite"
      primaryHref="/ats"
      primaryLabel="Back To ATS"
      summary={`${candidate.name || "This candidate"} is currently in ${candidate.stage || "the current stage"} for the ${candidate.role || "assigned"} pipeline at ${candidate.client || "the assigned client"}.`}
      details={pageData.details}
      actions={
        candidate.resumeDataUrl ? (
          <button className="primary-button resume-download-button" onClick={() => downloadCandidateResume(candidate)} type="button">
            Download CV
          </button>
        ) : null
      }
      sections={pageData.sections}
    />
  );
}
