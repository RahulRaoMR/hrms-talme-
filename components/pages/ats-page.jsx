"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  approveCandidateAction,
  bulkDeleteCandidatesAction,
  createCandidateAction,
  createJobOpeningAction,
  deleteJobOpeningAction,
  deleteCandidateAction,
  importCandidatesAction,
  updateCandidateAction
} from "@/lib/api-actions";
import CsvActions from "@/components/csv-actions";
import Drawer from "@/components/drawer";
import FilterChips from "@/components/filter-chips";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { demoSeed, storeKeys } from "@/lib/demo-data";
import { useDemoStore } from "@/lib/use-demo-store";

const requirementSeed = {
  agingDays: "",
  hireType: "New Hire",
  jobId: "",
  postedDate: "",
  businessUnit: "Manufacturing HR",
  department: "",
  client: "",
  domain: "",
  position: "",
  priority: "Medium",
  numberOfOpenings: "",
  status: "Open",
  remarks: "",
  candidateConcerned: "",
  holdDate: "",
  offerStageDate: "",
  offerDate: "",
  joiningDate: "",
  candidateCtc: "",
  source: "Direct ATS",
  harmonizedRole: "",
  recruiterTagged: "",
  originalJobPostDate: ""
};

const requirementFields = [
  { key: "agingDays", label: "Aging", type: "number" },
  { key: "hireType", label: "Type of Hire", type: "select", options: ["New Hire", "Replacement", "Contract", "Internal Movement"] },
  { key: "jobId", label: "Job ID", required: true },
  { key: "postedDate", label: "Job Posted Date", type: "date" },
  { key: "businessUnit", label: "Business Unit" },
  { key: "department", label: "Department" },
  { key: "client", label: "Client" },
  { key: "domain", label: "Domain" },
  { key: "position", label: "Position", required: true },
  { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low", "Critical"] },
  { key: "numberOfOpenings", label: "Number of Openings", type: "number" },
  { key: "status", label: "Position Current Status", type: "select", options: ["Open", "Hold", "Closed", "Offer Stage", "Joined"] },
  { key: "remarks", label: "Remarks" },
  { key: "candidateConcerned", label: "Candidate Concerned" },
  { key: "holdDate", label: "Date of Hold", type: "date" },
  { key: "offerStageDate", label: "Date of Offer Stage", type: "date" },
  { key: "offerDate", label: "Date of Offer", type: "date" },
  { key: "joiningDate", label: "Date of Joining", type: "date" },
  { key: "candidateCtc", label: "CTC of Candidate" },
  { key: "source", label: "Source" },
  { key: "harmonizedRole", label: "Harmonized Role" },
  { key: "recruiterTagged", label: "Recruiter tagged" },
  { key: "originalJobPostDate", label: "Original Job Post Date", type: "date" }
];

const requirementColumnClasses = {
  agingDays: "requirement-aging-column",
  hireType: "requirement-hire-type-column",
  jobId: "requirement-job-id-column",
  postedDate: "requirement-posted-date-column",
  businessUnit: "requirement-business-unit-column",
  department: "requirement-department-column",
  client: "requirement-client-column",
  domain: "requirement-domain-column",
  position: "requirement-position-column",
  priority: "requirement-priority-column",
  numberOfOpenings: "requirement-openings-column",
  status: "requirement-status-column",
  remarks: "requirement-remarks-column",
  candidateConcerned: "requirement-candidate-column",
  holdDate: "requirement-hold-date-column",
  offerStageDate: "requirement-offer-stage-date-column",
  offerDate: "requirement-offer-date-column",
  joiningDate: "requirement-joining-date-column",
  candidateCtc: "requirement-candidate-ctc-column",
  source: "requirement-source-column",
  harmonizedRole: "requirement-harmonized-role-column",
  recruiterTagged: "requirement-recruiter-column",
  originalJobPostDate: "requirement-original-posted-date-column"
};

const requirementDateFields = new Set([
  "postedDate",
  "holdDate",
  "offerStageDate",
  "offerDate",
  "joiningDate",
  "originalJobPostDate"
]);

const dateMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const candidatePageSize = 10;
const requirementPageSize = 10;
const sharePointAtsWorkbookUrl =
  "https://talmetech-my.sharepoint.com/:x:/g/personal/badri_talme_in/IQBWSBaW6j6WTrqR2hkOgXvxAe7HF1cb0Wh7_ult4BL2TRY?e=yPN54q&nav=MTVfe0VGREI5Q0U2LUU1MTUtNEY5OC1BMDA0LTQ1QkRBQURERkQ5QX0";
const candidateFields = [
  { key: "jobId", label: "Job ID" },
  { key: "recruiterId", label: "Recruiter ID" },
  { key: "recruiterName", label: "Recruiter Name" },
  { key: "name", label: "Candidate Name", sortable: true },
  { key: "role", label: "Position", sortable: true },
  { key: "stage", label: "Stage", sortable: true },
  { key: "label", label: "Candidate Current Status", sortable: true, status: true },
  { key: "source", label: "Source", sortable: true },
  { key: "businessUnit", label: "Business Unit" },
  { key: "domain", label: "Domain" },
  { key: "client", label: "Client" },
  { key: "noticePeriod", label: "Notice Period" },
  { key: "email", label: "Candidate Email" },
  { key: "phone", label: "Phone No." },
  { key: "qualification", label: "Qualification" },
  { key: "yearsOfExperience", label: "Years of Exp" },
  { key: "previousCompany", label: "Previous Company" },
  { key: "previousCtc", label: "Previous CTC" },
  { key: "location", label: "Location" },
  { key: "preferredLocation", label: "Preferred Location" },
  { key: "expectedCtc", label: "Expected CTC" },
  { key: "sourceDate", label: "Source Date" },
  { key: "screeningDate", label: "Screening Date" },
  { key: "screeningNotes", label: "Screening Notes" },
  { key: "tech1Date", label: "Tech 1 Date" },
  { key: "tech1Status", label: "Tech 1 Status" },
  { key: "tech1Remarks", label: "Tech 1 Remarks" },
  { key: "tech1Panel", label: "Tech 1 Panel" },
  { key: "tech2Date", label: "Tech 2 Date" },
  { key: "tech2Status", label: "Tech 2 Status" },
  { key: "tech2Remarks", label: "Tech 2 Remarks" },
  { key: "tech2Panel", label: "Tech 2 Panel" },
  { key: "tech3Date", label: "Tech 3 Date" },
  { key: "tech3Status", label: "Tech 3 Status" },
  { key: "tech3Remarks", label: "Tech 3 Remarks" },
  { key: "tech3Panel", label: "Tech 3 Panel" },
  { key: "offerStageInputDate", label: "Offer Stage Input Date" },
  { key: "documentCollectionDate", label: "Document Collection Date" },
  { key: "approvalDate", label: "Approval Date" },
  { key: "offerDate", label: "Offer Date" },
  { key: "offerStatus", label: "Offer Status" },
  { key: "offerDecisionDate", label: "Offer Accept/Reject Date" },
  { key: "offerAcceptStatus", label: "Offer Accept Status" },
  { key: "joiningDate", label: "Date Of Joining" },
  { key: "joiningStatus", label: "Joining Status" },
  { key: "offeredCtc", label: "CTC Offered" }
];
const candidateSearchKeys = candidateFields.map((field) => field.key);
const candidateRequiredFields = new Set(["name", "role", "stage", "source"]);
const candidateDateFields = new Set(candidateFields.filter((field) => /date/i.test(field.key)).map((field) => field.key));
const candidateLongTextFields = new Set(["screeningNotes", "tech1Remarks", "tech2Remarks", "tech3Remarks"]);
const candidateFormSeed = {
  ...Object.fromEntries(candidateFields.map((field) => [field.key, ""])),
  name: "Asha Verma",
  email: "asha.verma@talme.ai",
  role: "Talent Specialist",
  stage: "Screening",
  label: "New",
  source: "Direct ATS"
};

function buildCandidatePayload(state) {
  const payload = Object.fromEntries(
    candidateFields
      .filter((field) => field.key !== "label")
      .map((field) => [field.key, state?.[field.key] ?? ""])
  );
  const status = state?.label || state?.status || "New";

  return {
    ...payload,
    status,
    tone: state?.tone || statusTone(status, "gold")
  };
}

function CandidateFormFields({ state, onChange }) {
  return (
    <div className="form-grid candidate-record-grid">
      {candidateFields.map((field) => {
        const value = state?.[field.key] ?? "";
        const commonProps = {
          required: candidateRequiredFields.has(field.key),
          value,
          onChange: (event) => onChange(field.key, event.target.value)
        };

        return (
          <label className={candidateLongTextFields.has(field.key) ? "candidate-wide-field" : ""} key={field.key}>
            <span>{field.label}</span>
            {candidateLongTextFields.has(field.key) ? (
              <textarea rows={3} {...commonProps} />
            ) : (
              <input
                inputMode={field.key === "phone" ? "tel" : field.key === "yearsOfExperience" ? "decimal" : undefined}
                type={candidateDateFields.has(field.key) ? "date" : field.key === "email" ? "email" : "text"}
                {...commonProps}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function formatRequirementDate(value) {
  if (!value) return "-";

  const dateValue = String(value).slice(0, 10);
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return String(value);

  const [, year, month, day] = match;
  return `${Number(day)}-${dateMonths[Number(month) - 1]}-${year.slice(-2)}`;
}

function formatRequirementValue(opening, field) {
  const value = opening[field.key];

  if (requirementDateFields.has(field.key)) {
    return formatRequirementDate(value);
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function formatCandidateValue(candidate, field) {
  const value = candidate[field.key];

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function statusTone(status, fallback = "gold") {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "open" || normalized === "joined") return "teal";
  if (normalized === "hold" || normalized === "offer stage") return "gold";
  if (normalized === "closed") return "slate";

  return fallback;
}

function matchesRequirementSearch(opening, search) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) return true;

  return requirementFields.some((field) => {
    const value = field.key === "status" ? opening.status || "Open" : formatRequirementValue(opening, field);

    return String(value || "").toLowerCase().includes(normalizedSearch);
  });
}

function formatCandidateNameFromFile(fileName) {
  return String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseCandidateCvText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const roleLine = lines.find((line) => /^(role|title|position|designation)\s*:/i.test(line));
  const role = roleLine?.replace(/^(role|title|position|designation)\s*:\s*/i, "") || "";
  const name = lines.find((line) =>
    !line.includes("@") &&
    !/^(role|title|position|designation|phone|mobile|email|summary|experience)\b/i.test(line) &&
    line.split(/\s+/).length <= 4
  );

  return { email, name, role };
}

export default function AtsPageClient({ data = {} }) {
  const { items: candidates, prepend, reload, replace, remove } = useDemoStore(
    storeKeys.candidates,
    demoSeed.candidates,
    "/api/candidates"
  );
  const [sourceFilter, setSourceFilter] = useState("All");
  const [candidateSearchInput, setCandidateSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const cvInputRef = useRef(null);
  const [formState, setFormState] = useState(candidateFormSeed);
  const [cvFileName, setCvFileName] = useState("");
  const [jobOpenings, setJobOpenings] = useState(data.jobOpenings || []);
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [requirementForm, setRequirementForm] = useState(requirementSeed);
  const [requirementMessage, setRequirementMessage] = useState("");
  const [requirementSearchInput, setRequirementSearchInput] = useState("");
  const [requirementSearch, setRequirementSearch] = useState("");
  const [requirementPage, setRequirementPage] = useState(1);
  const [editState, setEditState] = useState(null);

  const importCandidateFromCv = async (file) => {
    if (!file) return;

    const fileName = file.name || "";
    const fallbackName = formatCandidateNameFromFile(fileName);
    let parsed = {};

    if (/\.txt$/i.test(fileName) || file.type.startsWith("text/")) {
      const text = await file.text();
      parsed = parseCandidateCvText(text);
    }

    setCvFileName(fileName);
    setFormState((current) => ({
      ...current,
      name: parsed.name || fallbackName || current.name,
      email: parsed.email || current.email,
      role: parsed.role || current.role,
      stage: current.stage || "Screening",
      source: "CV Import"
    }));
  };

  const normalizedCandidates = useMemo(
    () =>
      candidates.map((candidate) => ({
        ...candidate,
        label: candidate.label || candidate.status,
        tone: candidate.tone || "slate"
      })),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const filtered = normalizedCandidates.filter((candidate) => {
      const matchesSource = sourceFilter === "All" || candidate.source === sourceFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        candidateSearchKeys.some((key) => String(candidate[key] || "").toLowerCase().includes(q));
      return matchesSource && matchesQuery;
    });

    return filtered.sort((a, b) => {
      const aValue = String(a[sort.key] || "").toLowerCase();
      const bValue = String(b[sort.key] || "").toLowerCase();
      return sort.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [normalizedCandidates, query, sort, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / candidatePageSize));
  const safeCandidatePage = Math.min(page, totalPages);
  const candidateStartIndex = (safeCandidatePage - 1) * candidatePageSize;
  const pagedCandidates = filteredCandidates.slice(candidateStartIndex, candidateStartIndex + candidatePageSize);
  const pagedIds = pagedCandidates.map((candidate) => candidate.id);
  const filteredJobOpenings = useMemo(
    () => jobOpenings.filter((opening) => matchesRequirementSearch(opening, requirementSearch)),
    [jobOpenings, requirementSearch]
  );
  const requirementTotalPages = Math.max(1, Math.ceil(filteredJobOpenings.length / requirementPageSize));
  const safeRequirementPage = Math.min(requirementPage, requirementTotalPages);
  const requirementStartIndex = (safeRequirementPage - 1) * requirementPageSize;
  const pagedJobOpenings = filteredJobOpenings.slice(
    requirementStartIndex,
    requirementStartIndex + requirementPageSize
  );
  const requirementFrom = filteredJobOpenings.length ? requirementStartIndex + 1 : 0;
  const requirementTo = Math.min(requirementStartIndex + pagedJobOpenings.length, filteredJobOpenings.length);

  const submitCandidateSearch = (event) => {
    event.preventDefault();
    setQuery(candidateSearchInput.trim());
    setPage(1);
  };

  const clearCandidateSearch = () => {
    setCandidateSearchInput("");
    setQuery("");
    setPage(1);
  };

  const submitRequirementSearch = (event) => {
    event.preventDefault();
    setRequirementSearch(requirementSearchInput.trim());
    setRequirementPage(1);
  };

  const clearRequirementSearch = () => {
    setRequirementSearchInput("");
    setRequirementSearch("");
    setRequirementPage(1);
  };

  const toggleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const updateRequirementField = (key) => (event) => {
    setRequirementMessage("");
    setRequirementForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const saveRequirement = (event) => {
    event.preventDefault();
    setRequirementMessage("");

    startTransition(async () => {
      try {
        const created = await createJobOpeningAction({
          ...requirementForm,
          agingDays: requirementForm.agingDays ? Number(requirementForm.agingDays) : undefined,
          numberOfOpenings: requirementForm.numberOfOpenings ? Number(requirementForm.numberOfOpenings) : undefined,
          tone: String(requirementForm.status || "").toLowerCase() === "open" ? "teal" : "gold"
        });
        setJobOpenings((current) => [created, ...current]);
        setRequirementPage(1);
        setRequirementMessage("Requirement saved to database.");
        setRequirementForm(requirementSeed);
        setRequirementModalOpen(false);
      } catch (error) {
        setRequirementMessage(error?.message || "Unable to save requirement.");
      }
    });
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SuiteShell
      eyebrow="ATS Module"
      title="Recruitment Command Center"
      primaryHref="/hrms"
      primaryLabel="Go To HRMS"
      actions={
        <>
          <button
            className="ghost-button"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            Pipeline Insight
          </button>
          <button
            className="ghost-button"
            onClick={() => scrollToSection("requirement-overview")}
            type="button"
          >
            Requirement Overview
          </button>
          <button
            className="ghost-button"
            onClick={() => scrollToSection("candidate-shortlist")}
            type="button"
          >
            Candidate Shortlist
          </button>
          <a
            className="ghost-button"
            href={sharePointAtsWorkbookUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open SharePoint ATS
          </a>
        </>
      }
      brandEyebrow="ATS Suite"
    >
      <section className="page-section panel" id="requirement-overview">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Requirement Overview</p>
              <h3>Registered details</h3>
            </div>
            <button
              className="mini-button"
              onClick={() => {
                setRequirementMessage("");
                setRequirementForm(requirementSeed);
                setRequirementModalOpen(true);
              }}
              type="button"
            >
              Add
            </button>
          </div>
          {jobOpenings.length ? (
            <div className="requirement-register">
              <form className="requirement-toolbar" onSubmit={submitRequirementSearch}>
                <input
                  className="search-input requirement-search-input"
                  placeholder="Search requirement details"
                  value={requirementSearchInput}
                  onChange={(event) => setRequirementSearchInput(event.target.value)}
                />
                <button className="mini-button" type="submit">
                  Search
                </button>
                {requirementSearch ? (
                  <button className="mini-button" onClick={clearRequirementSearch} type="button">
                    Clear
                  </button>
                ) : null}
              </form>
              <table className="data-table requirement-table">
                <thead>
                  <tr>
                    {requirementFields.map((field) => (
                      <th className={requirementColumnClasses[field.key]} key={field.key}>{field.label}</th>
                    ))}
                    <th className="requirement-row-actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedJobOpenings.map((opening, index) => (
                    <tr key={opening.id || opening.jobId || `${opening.position}-${index}`}>
                      {requirementFields.map((field) => (
                        <td
                          className={requirementColumnClasses[field.key]}
                          key={field.key}
                        >
                          {field.key === "status" ? (
                            <StatusBadge tone={statusTone(opening.status, opening.tone)}>
                              {opening.status || "Open"}
                            </StatusBadge>
                          ) : field.key === "position" ? (
                            <strong>{opening.position || "Untitled position"}</strong>
                          ) : (
                            formatRequirementValue(opening, field)
                          )}
                        </td>
                      ))}
                      <td className="requirement-row-actions-column">
                        <button
                          aria-label={`Delete ${opening.position || opening.jobId || "requirement"}`}
                          className="mini-button danger-button requirement-delete-button"
                          disabled={isPending || !opening.id}
                          onClick={() =>
                            startTransition(async () => {
                              await deleteJobOpeningAction(opening.id);
                              setJobOpenings((current) => current.filter((item) => item.id !== opening.id));
                            })
                          }
                          title="Delete requirement"
                          type="button"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!pagedJobOpenings.length ? (
                    <tr>
                      <td colSpan={requirementFields.length + 1}>No matching requirements found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <div className="requirement-pagination">
                <p className="requirement-count">
                  Showing {requirementFrom}-{requirementTo} of {filteredJobOpenings.length} registered requirements
                </p>
                <div className="row-actions">
                  <button
                    className="mini-button"
                    disabled={safeRequirementPage <= 1}
                    onClick={() => setRequirementPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="page-badge">
                    {safeRequirementPage} / {requirementTotalPages}
                  </span>
                  <button
                    className="mini-button"
                    disabled={safeRequirementPage >= requirementTotalPages}
                    onClick={() => setRequirementPage((current) => Math.min(requirementTotalPages, current + 1))}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="empty-state">No requirements registered yet.</p>
          )}
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Pipeline</p>
            <h3>Hiring flow</h3>
          </div>
          <button
            className="mini-button"
            onClick={() => {
              setCvFileName("");
              setModalOpen(true);
            }}
            type="button"
          >
            Add Candidate
          </button>
        </div>
        <div className="flow-grid">
          <div className="flow-card"><strong>Requisition</strong><small>Plant HR Manager</small></div>
          <div className="flow-card"><strong>Sourcing</strong><small>64 profiles</small></div>
          <div className="flow-card"><strong>Interview</strong><small>12 scheduled</small></div>
          <div className="flow-card"><strong>Offer</strong><small>4 released</small></div>
        </div>
      </section>

      <section className="page-section panel" id="candidate-shortlist">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Candidate Shortlist</p>
            <h3>Source-aware review</h3>
          </div>
        </div>
        <div className="table-toolbar candidate-shortlist-toolbar">
          <FilterChips
            options={["All", "Direct ATS", "CV Import", "Staffing Vendor", "Referral"]}
            value={sourceFilter}
            onChange={(value) => {
              setSourceFilter(value);
              setPage(1);
            }}
          />
          <form className="candidate-search-form" onSubmit={submitCandidateSearch}>
            <input
              className="search-input"
              placeholder="Search Candidate Master"
              value={candidateSearchInput}
              onChange={(event) => {
                setCandidateSearchInput(event.target.value);
              }}
            />
            <button className="mini-button candidate-toolbar-button" type="submit">
              Search
            </button>
            {query ? (
              <button className="mini-button candidate-toolbar-button" onClick={clearCandidateSearch} type="button">
                Clear
              </button>
            ) : null}
          </form>
          <button
            className="mini-button danger-button candidate-toolbar-button"
            disabled={selectedIds.length === 0 || isPending}
            onClick={() =>
              startTransition(async () => {
                await bulkDeleteCandidatesAction(selectedIds);
                selectedIds.forEach((id) => remove(id));
                setSelectedIds([]);
                await reload();
              })
            }
            type="button"
          >
            Delete Selected ({selectedIds.length})
          </button>
          <div className="candidate-csv-actions">
            <CsvActions
              filename="talme-candidates.csv"
              rows={filteredCandidates}
              columns={candidateFields.map(({ key, label }) => ({ key, label }))}
              sample={"Asha Verma,Talent Specialist,Screening,Direct ATS,Imported"}
              onImport={importCandidatesAction}
              onImported={reload}
            />
          </div>
        </div>
        <table className="data-table candidate-master-table">
          <thead>
            <tr>
              <th>
                <input
                  aria-label="Select visible candidates"
                  checked={pagedIds.length > 0 && pagedIds.every((id) => selectedIds.includes(id))}
                  onChange={(event) =>
                    setSelectedIds((current) =>
                      event.target.checked
                        ? Array.from(new Set([...current, ...pagedIds]))
                        : current.filter((id) => !pagedIds.includes(id))
                    )
                  }
                  type="checkbox"
                />
              </th>
              {candidateFields.map((field) => (
                <th key={field.key}>
                  {field.sortable ? (
                    <button className="table-sort" onClick={() => toggleSort(field.key)} type="button">
                      {field.label}
                    </button>
                  ) : (
                    field.label
                  )}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedCandidates.map((candidate) => (
              <tr key={candidate.id || `${candidate.name}-${candidate.role}`}>
                <td>
                  <input
                    aria-label={`Select ${candidate.name}`}
                    checked={selectedIds.includes(candidate.id)}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, candidate.id]
                          : current.filter((id) => id !== candidate.id)
                      )
                    }
                    type="checkbox"
                  />
                </td>
                {candidateFields.map((field) => (
                  <td
                    className={field.key === "name" ? "candidate-name-cell" : undefined}
                    key={field.key}
                  >
                    {field.status ? (
                      <StatusBadge tone={candidate.tone}>{candidate.label}</StatusBadge>
                    ) : field.key === "name" ? (
                      <strong>{formatCandidateValue(candidate, field)}</strong>
                    ) : (
                      formatCandidateValue(candidate, field)
                    )}
                  </td>
                ))}
                <td>
                  <div className="row-actions">
                    <Link
                      aria-label={`View ${candidate.name}`}
                      className="mini-button table-icon-button"
                      href={`/candidates/${candidate.id}`}
                      title="View"
                    >
                      👁️
                    </Link>
                    <button
                      aria-label={`Edit ${candidate.name}`}
                      className="mini-button table-icon-button"
                      onClick={() => {
                        setEditState(candidate);
                        setEditModalOpen(true);
                      }}
                      title="Edit"
                      type="button"
                    >
                      ✏️
                    </button>
                    <button
                      aria-label={`Approve ${candidate.name}`}
                      className="mini-button table-icon-button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const approved = await approveCandidateAction(candidate.id);
                          replace(candidate.id, approved);
                          await reload();
                        })
                      }
                      title="Approve"
                      type="button"
                    >
                      ✅
                    </button>
                    <button
                      aria-label={`Delete ${candidate.name}`}
                      className="mini-button danger-button table-icon-button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteCandidateAction(candidate.id);
                          remove(candidate.id);
                          await reload();
                        })
                      }
                      title="Delete"
                      type="button"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!pagedCandidates.length ? (
              <tr>
                <td colSpan={candidateFields.length + 2}>No matching candidates found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="pagination-row">
          <span className="pagination-note">
            Showing {pagedCandidates.length} of {filteredCandidates.length} candidates
          </span>
          <div className="row-actions">
            <button
              className="mini-button"
              disabled={safeCandidatePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <span className="page-badge">
              {safeCandidatePage} / {totalPages}
            </span>
            <button
              className="mini-button"
              disabled={safeCandidatePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Interview Cadence</p>
              <h3>Structured process</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="process-card"><strong>Screening</strong><small>TA review and score capture</small></div>
            <div className="process-card"><strong>Business Round</strong><small>Plant and HR leadership</small></div>
            <div className="process-card"><strong>Final Approval</strong><small>Offer and onboarding release</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">ATS Outcomes</p>
              <h3>Premium visibility</h3>
            </div>
          </div>
          <div className="signal-row">
            <span className="teal">Time-to-hire improving</span>
            <span>Vendor-sourced roles stable</span>
            <span className="gold">2 final approvals pending</span>
          </div>
        </article>
      </section>

      <Modal
        open={modalOpen}
        eyebrow="Create Candidate"
        title="Add to ATS Pipeline"
        onClose={() => setModalOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const created = await createCandidateAction(buildCandidatePayload(formState));
              prepend(created);
              await reload();
              setModalOpen(false);
              setFormState(candidateFormSeed);
              setCvFileName("");
              setSourceFilter("All");
            });
          }}
        >
          <CandidateFormFields
            state={formState}
            onChange={(key, value) => setFormState((current) => ({ ...current, [key]: value }))}
          />
          <input
            ref={cvInputRef}
            accept=".pdf,.doc,.docx,.txt"
            className="sr-only"
            onChange={(event) => {
              importCandidateFromCv(event.target.files?.[0]);
              event.target.value = "";
            }}
            type="file"
          />
          {cvFileName ? <p className="cv-import-note">Imported from {cvFileName}</p> : null}
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => cvInputRef.current?.click()} type="button">
              Import from CV
            </button>
            <button className="ghost-button" onClick={() => setModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Candidate"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={requirementModalOpen}
        eyebrow="Requirement Overview"
        title="Create job opening"
        onClose={() => setRequirementModalOpen(false)}
      >
        <form onSubmit={saveRequirement}>
          <div className="form-grid requirement-overview-grid">
            {requirementFields.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                {field.type === "select" ? (
                  <select
                    required={field.required}
                    value={requirementForm[field.key]}
                    onChange={updateRequirementField(field.key)}
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={field.required}
                    type={field.type || "text"}
                    value={requirementForm[field.key]}
                    onChange={updateRequirementField(field.key)}
                  />
                )}
              </label>
            ))}
          </div>
          {requirementMessage ? <p className="requirement-message">{requirementMessage}</p> : null}
          <div className="modal-actions requirement-actions">
            <button className="ghost-button" onClick={() => setRequirementForm(requirementSeed)} type="button">
              Reset
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Requirement"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen && !!editState}
        eyebrow="Update Candidate"
        title="Edit ATS Record"
        onClose={() => {
          setEditModalOpen(false);
          setEditState(null);
        }}
      >
        {editState ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const updated = await updateCandidateAction(editState.id, buildCandidatePayload(editState));
                replace(editState.id, updated);
                await reload();
                setEditModalOpen(false);
                setEditState(null);
              });
            }}
          >
            <CandidateFormFields
              state={editState}
              onChange={(key, value) => setEditState((current) => ({ ...current, [key]: value }))}
            />
            <div className="modal-actions">
              <button
                className="ghost-button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditState(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-button" disabled={isPending} type="submit">
                {isPending ? "Updating..." : "Update Candidate"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Drawer
        open={drawerOpen}
        eyebrow="ATS Insight"
        title="Pipeline Readout"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="process-card">
          <strong>Requisition Pressure</strong>
          <small>Security and workforce operations roles are the fastest-moving openings.</small>
        </div>
        <div className="process-card">
          <strong>Source Mix</strong>
          <small>Direct ATS is strongest for corporate hiring; vendors are stronger for field roles.</small>
        </div>
        <div className="process-card">
          <strong>Offer Risk</strong>
          <small>2 final approvals are still waiting on compensation sign-off.</small>
        </div>
      </Drawer>
    </SuiteShell>
  );
}
