"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SuiteShell from "@/components/suite-shell";

const leavePolicy =
  "Employees are entitled to a maximum of one and a half (1.5) days of leave per month, subject to proper written approval from Talme. Unused leave cannot be carried forward to subsequent months and any unused paid leave cannot be claimed or cashed in.";

const initialOfferLetter = {
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
  
  employeeEsi: "Rs. 1,350",
  employerEsi: "Rs. 5,850",
  medicalInsurance: "Rs. 6,000",
  leaveEntitlement: leavePolicy,
  
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
  ["employeeEsi", "Employee's Contribution to ESIC"],
  ["employerEsi", "Employer's Contribution to ESIC"],
  ["medicalInsurance", "Medical Insurance"],
  ["leaveEntitlement", "Leave"],
  ["reportingManager", "Reporting Manager"],
  ["weekdayShiftTiming", "Monday to Friday Timing"],
 ["saturdayShiftTiming", "Saturday Timing"],
  ];

const experienceLetterBody =
  "This is to certify that Mr.Chandan Y C was employed with Talme Technologies Private Ltd in the role of Design Engineer from 15th MAY 2024 to 13th March 2026.\n\n" +
  "Through out the tenure He demonstrated exceptional dedication and commitment to his role, consistently delivering high-quality work and fulfilling all assigned responsibilities with sincerity and professionalism.\n\n" +
  "His performance has been commendable, and He has proven to be an asset to our organisation. We are confident that his skills, passion, and determination will enable him to succeed in all his future endeavours. We extend our best wishes to him for continued success in his career and personal growth.";

const initialExperienceLetter = {
  employeeName: "Chandan Y C",
  designation: "Design Engineer",
  companyName: "Talme Technologies Pvt Ltd",
  issueDate: "21/04/2026",
  startDate: "15th MAY 2024",
  endDate: "13th March 2026",
  signatoryName: "Saidarshan M.V",
  signatoryTitle: "Director of Talme Technologies",
  body: experienceLetterBody
};

const relievingLetterBody =
  "This letter serves as official confirmation of your relieved services / employment with Talme Technologies Pvt Ltd and the effective date is 13th March 2026.\n\n" +
  "We would like to express our appreciation for your contributions and efforts during your tenure with Talme Technologies Pvt Ltd. Your dedication, hard work, and commitment to your responsibilities are duly acknowledged and valued.\n\n" +
  "We understand that the end of employment can be a challenging period of transition. Therefore, we want to ensure that this process is as smooth as possible for you. Below are the details and instructions regarding your relieving process:\n\n" +
  "Documentation: The HR department will provide you with the necessary documents, such as your experience certificate and relevant paperwork, If you have any specific requirements or need assistance with future job applications, please feel free to contact the HR department.\n\n" +
  "We would like to extend our best wishes to you in your future endeavours. We believe that your skills and capabilities will lead you to success in your professional journey. If you have any further questions or require additional information, please do not hesitate to reach out to the HR department. They will be happy to assist you during this transition period.\n\n" +
  "Thank you once again for your contribution to Talme Technologies Pvt Ltd. We value the time you spent with us and wish you all the best for your future endeavours.";

const initialRelievingLetter = {
  employeeName: "Chandan Y C",
  designation: "HR Executive",
  companyName: "Talme Technologies Pvt Ltd",
  issueDate: "21/04/2026",
  startDate: "01 April 2024",
  endDate: "13th March 2026",
  relievingDate: "13th March 2026",
  signatoryName: "SaiDarshan M.V",
  signatoryTitle: "Director of Talme Technologies",
  body: relievingLetterBody
};

const initialNdaLetter = {
  employeeName: "Shehnaz Alam",
  companyName: "Talme Technologies Pvt Ltd",
  companyAddress: "Level 14, Concorde Towers, UB City, Bengaluru, Karnataka, India",
  employeeAddress: "Bengaluru, Karnataka",
  agreementDate: "22 May 2026",
  signatoryName: "Authorized Signatory",
  signatoryTitle: "HR Manager",
  body: ""
};

const letterTypes = [
  {
    id: "offer",
    title: "Offer Letter",
    eyebrow: "Offer",
    endpoint: "/api/pdf/offer-letter",
    template: "/templates/talme-offer-letter-template.pdf",
    initial: initialOfferLetter,
    button: "Generate Offer Letter",
    fields: [
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
      ["leaveEntitlement", "Leave", "textarea"],
      ["reportingManager", "Reporting Manager"],
      ["weekdayShiftTiming", "Monday to Friday Timing"],
      ["saturdayShiftTiming", "Saturday Timing"]
    ]
  },
  {
    id: "experience",
    title: "Experience Letter",
    eyebrow: "Experience",
    endpoint: "/api/pdf/hr-letter",
    template: "/templates/talme-experience-letter-template.pdf",
    initial: initialExperienceLetter,
    button: "Generate Experience Letter",
    fields: [
      ["employeeName", "Employee Name"],
      ["designation", "Designation"],
      ["companyName", "Company Name"],
      ["issueDate", "Letter Date"],
      ["startDate", "Start Date"],
      ["endDate", "End Date"],
      ["signatoryName", "Signatory Name"],
      ["signatoryTitle", "Signatory Title"],
      ["body", "Custom Body", "textarea"]
    ]
  },
  {
    id: "relieving",
    title: "Relieving Letter",
    eyebrow: "Relieving",
    endpoint: "/api/pdf/hr-letter",
    template: "/templates/talme-relieving-letter-template.pdf",
    initial: initialRelievingLetter,
    button: "Generate Relieving Letter",
    fields: [
      ["employeeName", "Employee Name"],
      ["designation", "Designation"],
      ["companyName", "Company Name"],
      ["issueDate", "Letter Date"],
      ["startDate", "Start Date"],
      ["endDate", "End Date"],
      ["relievingDate", "Relieving Date"],
      ["signatoryName", "Signatory Name"],
      ["signatoryTitle", "Signatory Title"],
      ["body", "Custom Body", "textarea"]
    ]
  },
  {
    id: "nda",
    title: "NDA Letter",
    eyebrow: "NDA",
    endpoint: "/api/pdf/hr-letter",
    template: "/templates/talme-nda-letter-template.pdf",
    initial: initialNdaLetter,
    button: "Generate NDA Letter",
    fields: [
      ["employeeName", "Employee Name"],
      ["companyName", "Company Name"],
      ["companyAddress", "Company Address", "textarea"],
      ["employeeAddress", "Employee Address", "textarea"],
      ["agreementDate", "Agreement Date"],
      ["signatoryName", "Signatory Name"],
      ["signatoryTitle", "Signatory Title"],
      ["body", "Confidentiality Text", "textarea"]
    ]
  }
 
];

const typeById = Object.fromEntries(letterTypes.map((type) => [type.id, type]));

function amountFrom(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function createInitialState() {
  return Object.fromEntries(letterTypes.map((type) => [type.id, type.initial]));
}

export default function LettersPageClient() {
  const [activeType, setActiveType] = useState("offer");
  const [letters, setLetters] = useState(createInitialState);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(true);
  const previewObjectUrl = useRef("");
  const selected = typeById[activeType];
  const letter = letters[activeType];

  const previewTitle = useMemo(() => {
    if (previewLoading) return `Updating ${selected.title.toLowerCase()}...`;
    return `${selected.title} preview`;
  }, [previewLoading, selected.title]);

  function updateField(field, value) {
    setLetters((current) => {
      const nextLetter = { ...current[activeType], [field]: value };
      if (activeType === "offer" && field === "ctc") {
        const ctc = amountFrom(value);
        nextLetter.monthlySalary = ctc ? `Rs. ${formatAmount(ctc / 12)}` : "";
      }
      return { ...current, [activeType]: nextLetter };
    });
  }

  async function requestPdf(type, payload) {
    const config = typeById[type];
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "offer" ? payload : { ...payload, type })
    });

    if (!response.ok) throw new Error(`Unable to generate ${config.title}.`);
    return response.blob();
  }

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const blob = await requestPdf(activeType, letter);
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
  }, [activeType, letter]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) {
        URL.revokeObjectURL(previewObjectUrl.current);
      }
    };
  }, []);

  async function generatePdf() {
    setGenerating(true);

    try {
      const blob = await requestPdf(activeType, letter);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SuiteShell eyebrow="Letters" title="Letter Generator" brandEyebrow="HRMS Suite">
      <section className="page-section letters-workspace">
        <article className="panel letter-form-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Letter Type</p>
              <h3>{selected.title}</h3>
            </div>
            <button className="primary-button" onClick={generatePdf} disabled={generating} type="button">
              {generating ? "Generating..." : selected.button}
            </button>
          </div>

          <div className="letter-type-tabs" role="tablist" aria-label="Letter type">
            {letterTypes.map((type) => (
              <button
                key={type.id}
                className={activeType === type.id ? "active" : ""}
                onClick={() => setActiveType(type.id)}
                type="button"
              >
                <span>{type.eyebrow}</span>
                <strong>{type.title}</strong>
              </button>
            ))}
          </div>

          <div className="letter-form-grid">
            {selected.fields.map(([field, label, control]) => (
              <label key={field} className={control === "textarea" ? "letter-wide-field" : ""}>
                <span>{label}</span>
                {control === "textarea" ? (
                  <textarea
                    value={letter[field] || ""}
                    onChange={(event) => updateField(field, event.target.value)}
                    placeholder={label}
                    rows={field === "body" && ["experience", "relieving"].includes(activeType) ? 12 : field === "body" ? 5 : 3}
                  />
                ) : (
                  <input
                    value={letter[field] || ""}
                    onChange={(event) => updateField(field, event.target.value)}
                    placeholder={label}
                  />
                )}
              </label>
            ))}
          </div>
        </article>

        <article className="letter-preview-panel">
          <div className="exact-pdf-preview">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Live Template</p>
                <h3>{previewTitle}</h3>
              </div>
              <button className="primary-button" onClick={generatePdf} disabled={generating} type="button">
                {generating ? "Generating..." : selected.button}
              </button>
            </div>
            <div className="pdf-preview-frame">
              <iframe
                title={`Live ${selected.title} preview`}
                src={`${previewUrl || selected.template}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`}
                scrolling="no"
              />
            </div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
