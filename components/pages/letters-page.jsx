"use client";

import { useEffect, useRef, useState } from "react";
import SuiteShell from "@/components/suite-shell";

const initialLetter = {
  candidateName: "Shehnaz Alam",
  jobRole: "HR Executive",
  companyName: "Talme Technologies Pvt Ltd",
  offerDate: "19 May 2026",
  offerDay: "Tuesday",
  dateOfJoining: "26 May 2026",
  joiningDay: "Tuesday",
  employmentType: "Full-time",
  workLocation: "Bengaluru",
  acceptanceDate: "22 May 2026",
  ctc: "Rs. 3,60,000 per annum",
  monthlySalary: "Rs. 15,000",
  joiningBonus: "Rs. 0",
  leaveEntitlement: "As per company policy",
  reportingManager: "HR Manager",
  weekdayShiftTiming: "08:00 AM to 5:30 PM",
  saturdayShiftTiming: "08:00 AM to 12:00 PM"
};

const fields = [
  ["candidateName", "Name"],
  ["jobRole", "Job Role"],
  ["companyName", "Company Name"],
  ["offerDate", "Offer Letter Date"],
  ["offerDay", "Offer Letter Day"],
  ["dateOfJoining", "Date of Joining"],
  ["joiningDay", "Date Day"],
  ["employmentType", "Employment Type"],
  ["workLocation", "Place / Location"],
  ["acceptanceDate", "Acceptance Date"],
  ["ctc", "CTC"],
  ["monthlySalary", "Monthly Salary"],
  ["joiningBonus", "Joining Bonus"],
  ["leaveEntitlement", "Leave"],
  ["reportingManager", "Reporting Manager"],
  ["weekdayShiftTiming", "Monday to Friday Timing"],
  ["saturdayShiftTiming", "Saturday Timing"]
];

function amountFrom(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

export default function LettersPageClient() {
  const [letter, setLetter] = useState(initialLetter);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(true);
  const previewObjectUrl = useRef("");

  function updateField(field, value) {
    setLetter((current) => {
      const next = { ...current, [field]: value };
      if (field === "ctc") {
        const ctc = amountFrom(value);
        next.monthlySalary = ctc ? `Rs. ${formatAmount(ctc / 12)}` : "";
      }
      return next;
    });
  }

  async function requestOfferLetterPdf(payload) {
    const response = await fetch("/api/pdf/offer-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Unable to generate offer letter.");
    return response.blob();
  }

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const blob = await requestOfferLetterPdf(letter);
        if (cancelled) return;

        if (previewObjectUrl.current) {
          URL.revokeObjectURL(previewObjectUrl.current);
        }

        const nextUrl = URL.createObjectURL(blob);
        previewObjectUrl.current = nextUrl;
        setPreviewUrl(nextUrl);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [letter]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) {
        URL.revokeObjectURL(previewObjectUrl.current);
      }
    };
  }, []);

  async function generateExactPdf() {
    setGenerating(true);

    try {
      const blob = await requestOfferLetterPdf(letter);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SuiteShell eyebrow="Letters" title="Offer Letter Generator" brandEyebrow="HRMS Suite">
      <section className="page-section letters-workspace">
        <article className="panel letter-form-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Manual Details</p>
              <h3>Offer letter information</h3>
            </div>
            <button className="primary-button" onClick={generateExactPdf} disabled={generating} type="button">
              {generating ? "Generating..." : "Generate Same PDF"}
            </button>
          </div>

          <div className="letter-form-grid">
            {fields.map(([field, label]) => (
              <label key={field}>
                <span>{label}</span>
                <input
                  value={letter[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  placeholder={label}
                />
              </label>
            ))}
          </div>
        </article>

        <article className="letter-preview-panel">
          <div className="exact-pdf-preview">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Live Template</p>
                <h3>{previewLoading ? "Updating offer letter..." : "Same PDF with manual details"}</h3>
              </div>
              <button className="primary-button" onClick={generateExactPdf} disabled={generating} type="button">
                {generating ? "Generating..." : "Generate Same PDF"}
              </button>
            </div>
            <div className="pdf-preview-frame">
              <iframe
                title="Live Talme offer letter preview"
                src={`${previewUrl || "/templates/talme-offer-letter-template.pdf"}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`}
                scrolling="no"
              />
            </div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
