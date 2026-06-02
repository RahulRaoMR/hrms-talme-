"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { rememberCandidateForDetail } from "@/components/pages/candidate-detail-page";
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

const candidateDropdownOptions = {
  techStatus: ["Select", "Reject", "Hold", "No Show"],
  offerStatus: ["Offered Yet to Join", "Doccument Collection", "Offer Drop", "Offer Stage Drop"],
  offerAcceptStatus: ["Offer Accepted", "Offer Rejected"],
  source: ["Portal-Naukri", "Portal-LinkedIN", "Employee Reference", "Campus Drive"],
  recruiters: ["Harish", "Harshitha", "Bhoomika", "Pooja", "Narthana", "Himanshu", "Pooja & Bhoomika"],
  joiningStatus: ["Joined", "No Show", "Drop after Offer Accept"],
  stage: ["Sourcing", "Screening", "Tech 1", "Tech 2", "Tech 3", "Client Feedback", "Offer", "Joining", "Pipeline"],
  currentStatus: [
    "Sourced",
    "Yet to Screen",
    "Screening Reject by Client",
    "Tech 1 to be Scheduled",
    "Tech 1 Awaiting Feedback",
    "Tech 1 Reject",
    "Tech 2 to be Scheduled",
    "Tech 2 Awaiting Feedback",
    "Tech 2 Reject",
    "Tech 3 to be Scheduled",
    "Tech 3 Awaiting Feedback",
    "Tech 3 Reject",
    "Yet to Offer",
    "Offer Released",
    "Document Collection",
    "Offer Accepted Yet to Join",
    "Offer Rejected",
    "Joined",
    "No Show",
    "Screening reject by HR",
    "Not Interested job change",
    "Awaiting feedback from client",
    "position closed",
    "Position on Hold"
  ],
  businessUnit: ["Talme"],
  department: ["Talme"]
};

const candidateSourceFilterOptions = ["All", ...candidateDropdownOptions.source, "Direct ATS", "CV Import", "Staffing Vendor", "Referral"];
const candidateProfileFields = [
  { key: "noticePeriod", label: "Notice Period" },
  { key: "qualification", label: "Qualification" },
  { key: "yearsOfExperience", label: "Experience", type: "number", step: "0.1" },
  { key: "previousCompany", label: "Previous Company" },
  { key: "previousCtc", label: "Previous CTC" },
  { key: "expectedCtc", label: "Expected CTC" },
  { key: "location", label: "Location" },
  { key: "preferredLocation", label: "Preferred Location" }
];
const candidateIntakeFields = [
  { key: "phone", label: "Phone" },
  { key: "jobId", label: "Job ID" },
  { key: "recruiterId", label: "Recruiter ID" },
  { key: "domain", label: "Domain" },
  { key: "client", label: "Client" },
  { key: "sourceDate", label: "Source Date", type: "date" },
  { key: "screeningDate", label: "Screening Date", type: "date" },
  { key: "screeningNotes", label: "Screening Notes", multiline: true }
];

function uniqueOptions(options) {
  return Array.from(new Set(options.filter(Boolean)));
}

function candidateStatusOptions(currentValue) {
  return uniqueOptions([currentValue, ...candidateDropdownOptions.currentStatus]);
}

function candidateStageOptions(currentValue) {
  return uniqueOptions([currentValue, ...candidateDropdownOptions.stage]);
}

function candidateSourceOptions(currentValue) {
  return uniqueOptions([currentValue, ...candidateDropdownOptions.source]);
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeCandidateText(candidate, fields) {
  return fields
    .map((field) => candidate?.[field])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasInterviewSignal(candidate) {
  const stage = normalizeCandidateText(candidate, ["stage"]);
  const status = normalizeCandidateText(candidate, [
    "label",
    "status",
    "tech1Status",
    "tech2Status",
    "tech3Status"
  ]);

  return (
    /interview|assessment|client feedback|tech\s*[123]/.test(stage) ||
    /interview|awaiting feedback|tech\s*[123]/.test(status) ||
    Boolean(candidate.tech1Date || candidate.tech2Date || candidate.tech3Date)
  );
}

function hasOfferReleaseSignal(candidate) {
  const stage = normalizeCandidateText(candidate, ["stage"]);
  const offerText = normalizeCandidateText(candidate, [
    "label",
    "status",
    "offerStatus",
    "offerAcceptStatus",
    "joiningStatus"
  ]);
  const isDroppedOrRejected = /yet to offer|rejected|drop|no show/.test(offerText);

  return (
    Boolean(candidate.offerDate) ||
    /offer released|offered yet to join|offer accepted|document collection/.test(offerText) ||
    (stage === "offer" && !isDroppedOrRejected)
  );
}

function candidateRequirementKey(candidate) {
  return candidate?.jobId || candidate?.role || "";
}

function isOpenRequirement(opening) {
  const status = String(opening?.status || "Open").toLowerCase();
  return status !== "closed" && status !== "joined";
}

function jobOpeningOptionLabel(opening) {
  return [opening.jobId, opening.position, opening.client].filter(Boolean).join(" - ");
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

function normalizeResumeText(text) {
  return String(text || "")
    .replace(/\\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\(([^()]{2,})\)/g, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readLooseResumeText(buffer) {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

  return normalizeResumeText(decoded);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function bytesToBinaryText(bytes) {
  let output = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    output += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }

  return output;
}

function binaryTextToBytes(text) {
  const bytes = new Uint8Array(text.length);

  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 255;
  }

  return bytes;
}

async function inflatePdfStream(bytes) {
  if (typeof DecompressionStream === "undefined") {
    return null;
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

function decodePdfLiteralString(value) {
  let output = "";

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char !== "\\") {
      output += char;
      continue;
    }

    const next = value[index + 1];

    if (!next) continue;
    if (next === "n") output += "\n";
    else if (next === "r") output += "\r";
    else if (next === "t") output += "\t";
    else if (next === "b") output += "\b";
    else if (next === "f") output += "\f";
    else if (["\\", "(", ")"].includes(next)) output += next;
    else if (/[0-7]/.test(next)) {
      const octal = value.slice(index + 1).match(/^[0-7]{1,3}/)?.[0] || "";
      output += String.fromCharCode(Number.parseInt(octal, 8));
      index += octal.length - 1;
    }

    index += 1;
  }

  return output;
}

function extractPdfTextOperators(content) {
  const chunks = [];
  const tokenPattern = /\((?:\\.|[^\\)])*\)|-?\d+(?:\.\d+)?/g;
  const arrayPattern = /\[(.*?)\]\s*TJ/gs;
  const textPattern = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let arrayMatch;

  while ((arrayMatch = arrayPattern.exec(content))) {
    const parts = [];
    const tokens = arrayMatch[1].match(tokenPattern) || [];

    for (const token of tokens) {
      if (token.startsWith("(")) {
        parts.push(decodePdfLiteralString(token.slice(1, -1)));
      } else if (Number(token) < -250) {
        parts.push(" ");
      }
    }

    chunks.push(parts.join(""));
  }

  let textMatch;

  while ((textMatch = textPattern.exec(content))) {
    chunks.push(decodePdfLiteralString(textMatch[0].replace(/\s*Tj$/, "").slice(1, -1)));
  }

  return chunks;
}

async function extractPdfResumeText(buffer) {
  const pdfText = bytesToBinaryText(new Uint8Array(buffer));
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const chunks = [];
  let match;

  while ((match = streamPattern.exec(pdfText))) {
    const inflated = await inflatePdfStream(binaryTextToBytes(match[1]));

    if (!inflated) continue;

    chunks.push(...extractPdfTextOperators(bytesToBinaryText(inflated)));
  }

  return normalizeResumeText(
    chunks
      .filter(Boolean)
      .join("\n")
      .replace(/[\u0005\u0088]/g, " ")
      .replace(/\u000b/g, "fi")
      .replace(/\u000d/g, "")
      .replace(/\u000e/g, "ff")
      .replace(/(?<=[a-z])(?=[A-Z])/g, " ")
      .replace(/\s+-\s+/g, " - ")
      .replace(/[ \t]+/g, " ")
  );
}

function getLabeledResumeValue(lines, labels) {
  const labelPattern = labels.join("|");
  const direct = lines.find((line) => new RegExp(`^(${labelPattern})\\s*[:|-]`, "i").test(line));

  if (direct) {
    return direct.replace(new RegExp(`^(${labelPattern})\\s*[:|-]\\s*`, "i"), "").trim();
  }

  const labelIndex = lines.findIndex((line) => new RegExp(`^(${labelPattern})$`, "i").test(line));
  return labelIndex >= 0 ? lines[labelIndex + 1] || "" : "";
}

function cleanPhone(value) {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .replace(/^00/, "+");
}

function sectionBetween(text, startPattern, endPattern) {
  const start = text.search(startPattern);

  if (start < 0) return "";

  const rest = text.slice(start);
  const end = rest.slice(1).search(endPattern);

  return end < 0 ? rest : rest.slice(0, end + 1);
}

function titleCaseResumeValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\b(Of|And|In)\b/g, (word) => word.toLowerCase())
    .trim();
}

function parseResumeMonth(value) {
  const months = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  };
  const match = String(value || "").match(/\b([A-Za-z]+)\s+(\d{4})\b/);

  if (!match) return null;

  const month = months[match[1].toLowerCase()];
  const year = Number(match[2]);

  return month === undefined || !year ? null : new Date(year, month, 1);
}

function monthsBetween(start, end) {
  if (!start || !end || end < start) return 0;

  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

function estimateExperienceYears(text) {
  const explicit =
    text.match(/(\d+(?:\.\d+)?)\s*(?:\+?\s*)?(?:years?|yrs?)\s+(?:of\s+)?experience/i) ||
    text.match(/experience\s*[:|-]?\s*(\d+(?:\.\d+)?)/i);

  if (explicit?.[1]) return explicit[1];

  const experienceSection = sectionBetween(text, /professional experience/i, /\n(?:skills|education|academic projects|certifications)\b/i);
  const rangePattern = /\b([A-Za-z]+\s+\d{4})\s*(?:-|{|to|–|—)\s*(Present|Current|[A-Za-z]+\s+\d{4})/gi;
  let months = 0;
  let match;

  while ((match = rangePattern.exec(experienceSection))) {
    const start = parseResumeMonth(match[1]);
    const end = /present|current/i.test(match[2]) ? new Date() : parseResumeMonth(match[2]);
    months += monthsBetween(start, end);
  }

  if (!months) return "";

  return String(Math.max(0.1, Math.round((months / 12) * 10) / 10));
}

function parseCandidateCvText(text) {
  const normalizedText = normalizeResumeText(text);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);
  const email = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phoneMatch =
    normalizedText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] ||
    getLabeledResumeValue(lines, ["phone", "mobile", "contact", "cell"]);
  const role =
    getLabeledResumeValue(lines, ["role", "title", "position", "designation", "current role"]) ||
    sectionBetween(normalizedText, /professional experience/i, /\n(?:skills|education|academic projects)\b/i)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => !/professional experience|pvt|ltd|private|bengaluru|karnataka|\d{4}|working|developing|building|collaborating/i.test(line)) ||
    lines.find((line) => /\b(engineer|developer|analyst|manager|specialist|consultant|recruiter|lead|architect|designer)\b/i.test(line)) ||
    "";
  const educationSection = sectionBetween(normalizedText, /education/i, /\n(?:academic projects|industry internship|internship|certifications|extra-curricula)\b/i);
  const degreeLine = educationSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => /\b(bachelor|master|engineering|degree|b\.?e|btech|mtech|bsc|msc|mba|computer science)\b/i.test(line));
  const specializationLine = educationSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => /computer science|electronics|mechanical|civil|information technology|science/i.test(line));
  const qualification =
    getLabeledResumeValue(lines, ["education", "qualification", "degree"]) ||
    [degreeLine, specializationLine !== degreeLine ? specializationLine : ""].filter(Boolean).join(" - ");
  const location =
    getLabeledResumeValue(lines, ["location", "current location", "address"]) ||
    lines.find((line) => /,\s*(india|karnataka|tamil nadu|telangana|maharashtra|kerala|delhi|bengaluru|bangalore|hyderabad|chennai|pune|mumbai)\b/i.test(line)) ||
    "";
  const noticePeriod = getLabeledResumeValue(lines, ["notice period", "notice"]);
  const previousCompany =
    getLabeledResumeValue(lines, ["company", "current company", "previous company", "employer"]) ||
    sectionBetween(normalizedText, /professional experience/i, /\n(?:skills|education|academic projects)\b/i)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /\b(pvt|ltd|private|technologies|solutions|systems|company|inc|llp)\b/i.test(line)) ||
    "";
  const name = lines.slice(0, 12).find((line) =>
    !line.includes("@") &&
    !/\d{4,}/.test(line) &&
    !/^(role|title|position|designation|phone|mobile|email|summary|profile|experience|education|qualification|location|address|linkedin|github|portfolio)\b/i.test(line) &&
    line.split(/\s+/).length <= 4
  );

  return {
    email,
    name,
    role,
    phone: cleanPhone(phoneMatch),
    qualification: titleCaseResumeValue(qualification),
    yearsOfExperience: estimateExperienceYears(normalizedText),
    previousCompany: titleCaseResumeValue(previousCompany),
    location: titleCaseResumeValue(location),
    noticePeriod
  };
}

export default function AtsPageClient({ data = {} }) {
  const { items: candidates, ready: candidatesReady, prepend, reload, replace, remove } = useDemoStore(
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
  const [savingCandidateKey, setSavingCandidateKey] = useState("");
  const [formState, setFormState] = useState({
    name: "Asha Verma",
    email: "asha.verma@talme.ai",
    role: "Talent Specialist",
    stage: "Sourcing",
    source: "Portal-Naukri",
    status: "Sourced",
    recruiterName: "Harish",
    businessUnit: "Talme",
    department: "Talme",
    phone: "",
    jobId: "",
    recruiterId: "",
    domain: "",
    client: "",
    sourceDate: "",
    screeningDate: "",
    screeningNotes: "",
    noticePeriod: "",
    qualification: "",
    yearsOfExperience: "",
    previousCompany: "",
    previousCtc: "",
    expectedCtc: "",
    location: "",
    preferredLocation: "",
    resumeFileName: "",
    resumeMimeType: "",
    resumeDataUrl: ""
  });
  const [cvFileName, setCvFileName] = useState("");
  const [cvImportMessage, setCvImportMessage] = useState("");
  const [jobOpenings, setJobOpenings] = useState(data.jobOpenings || []);
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [requirementForm, setRequirementForm] = useState(requirementSeed);
  const [requirementMessage, setRequirementMessage] = useState("");
  const [requirementSearchInput, setRequirementSearchInput] = useState("");
  const [requirementSearch, setRequirementSearch] = useState("");
  const [requirementPage, setRequirementPage] = useState(1);
  const [editState, setEditState] = useState(null);
  const candidateReloadRef = useRef(reload);

  useEffect(() => {
    candidateReloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    if (!candidatesReady) return undefined;

    const refreshCandidates = () => {
      if (document.visibilityState === "visible") {
        candidateReloadRef.current();
      }
    };
    const intervalId = window.setInterval(refreshCandidates, 15000);

    window.addEventListener("focus", refreshCandidates);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshCandidates);
    };
  }, [candidatesReady]);

  const importCandidateFromCv = async (file) => {
    if (!file) return;

    const fileName = file.name || "";
    const fallbackName = formatCandidateNameFromFile(fileName);
    let parsed = {};
    let text = "";
    let resumeDataUrl = "";

    try {
      resumeDataUrl = await readFileAsDataUrl(file);

      if (/\.pdf$/i.test(fileName) || file.type === "application/pdf") {
        text = await extractPdfResumeText(await file.arrayBuffer());
      } else if (/\.txt$/i.test(fileName) || file.type.startsWith("text/")) {
        text = await file.text();
      } else {
        text = readLooseResumeText(await file.arrayBuffer());
      }

      parsed = parseCandidateCvText(text);
    } catch {
      parsed = {};
    }

    setCvFileName(fileName);
    setFormState((current) => ({
      ...current,
      name: parsed.name || fallbackName || current.name,
      email: parsed.email || current.email,
      role: parsed.role || current.role,
      phone: parsed.phone || current.phone,
      qualification: parsed.qualification || current.qualification,
      yearsOfExperience: parsed.yearsOfExperience || current.yearsOfExperience,
      previousCompany: parsed.previousCompany || current.previousCompany,
      location: parsed.location || current.location,
      noticePeriod: parsed.noticePeriod || current.noticePeriod,
      stage: current.stage || "Sourcing",
      status: current.status || "Sourced",
      source: "CV Import",
      resumeFileName: fileName,
      resumeMimeType: file.type || "application/octet-stream",
      resumeDataUrl: resumeDataUrl || current.resumeDataUrl
    }));
    setCvImportMessage(
      parsed.email || parsed.phone || parsed.name
        ? `Imported from ${fileName}. Candidate details were filled automatically.`
        : `Imported from ${fileName}. Some PDF/DOCX resumes may need manual review if text is embedded as an image.`
    );
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
        candidate.name.toLowerCase().includes(q) ||
        candidate.role.toLowerCase().includes(q) ||
        candidate.stage.toLowerCase().includes(q) ||
        String(candidate.source || "").toLowerCase().includes(q) ||
        String(candidate.label || candidate.status || "").toLowerCase().includes(q) ||
        String(candidate.recruiterName || "").toLowerCase().includes(q) ||
        String(candidate.businessUnit || "").toLowerCase().includes(q) ||
        String(candidate.department || "").toLowerCase().includes(q);
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
  const jobOpeningOptions = useMemo(() => {
    const seen = new Set();

    return jobOpenings.filter((opening) => {
      if (!opening?.jobId || seen.has(opening.jobId)) return false;
      seen.add(opening.jobId);
      return true;
    });
  }, [jobOpenings]);
  const applyJobOpeningDetails = (current, jobId) => {
    const opening = jobOpeningOptions.find((item) => item.jobId === jobId);

    if (!opening) {
      return { ...current, jobId };
    }

    return {
      ...current,
      jobId,
      role: opening.position || current.role,
      domain: opening.domain || "",
      client: opening.client || "",
      businessUnit: opening.businessUnit || current.businessUnit,
      department: opening.department || current.department,
      source: opening.source || current.source,
      recruiterName: opening.recruiterTagged || current.recruiterName
    };
  };
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
  const pipelineRequirementScope = useMemo(
    () =>
      sourceFilter === "All"
        ? jobOpenings
        : jobOpenings.filter((opening) => opening.source === sourceFilter),
    [jobOpenings, sourceFilter]
  );
  const hiringFlowCards = useMemo(() => {
    const linkedRequirements = new Set(filteredCandidates.map(candidateRequirementKey).filter(Boolean)).size;
    const openRequirements = linkedRequirements || pipelineRequirementScope.filter(isOpenRequirement).length;
    const interviewCandidates = filteredCandidates.filter(hasInterviewSignal).length;
    const offerReleasedCandidates = filteredCandidates.filter(hasOfferReleaseSignal).length;

    return [
      {
        title: "Requisition",
        meta: linkedRequirements
          ? pluralize(linkedRequirements, "linked role")
          : pluralize(openRequirements, "open role")
      },
      {
        title: "Sourcing",
        meta: `${pluralize(filteredCandidates.length, "profile")} in review`
      },
      {
        title: "Interview",
        meta: `${pluralize(interviewCandidates, "candidate")} active`
      },
      {
        title: "Offer",
        meta: `${pluralize(offerReleasedCandidates, "released offer")}`
      }
    ];
  }, [filteredCandidates, pipelineRequirementScope]);

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

  const updateCandidateInline = (candidate, field, value) => {
    const currentValue =
      field === "status"
        ? candidate.label || candidate.status || candidate.stage || ""
        : candidate[field] || "";

    if (!candidate.id || value === currentValue) return;

    const patch =
      field === "status"
        ? { status: value, label: value }
        : { [field]: value };
    const rowKey = `${candidate.id}:${field}`;

    setSavingCandidateKey(rowKey);
    startTransition(async () => {
      try {
        const updated = await updateCandidateAction(candidate.id, patch);
        replace(candidate.id, { ...candidate, ...updated, ...patch });
        await reload();
      } finally {
        setSavingCandidateKey((current) => (current === rowKey ? "" : current));
      }
    });
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
          {hiringFlowCards.map((card) => (
            <div className="flow-card" key={card.title}>
              <strong>{card.title}</strong>
              <small>{card.meta}</small>
            </div>
          ))}
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
            options={candidateSourceFilterOptions}
            value={sourceFilter}
            onChange={(value) => {
              setSourceFilter(value);
              setPage(1);
            }}
          />
          <form className="candidate-search-form" onSubmit={submitCandidateSearch}>
            <input
              className="search-input"
              placeholder="Search candidate, role, or stage"
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
              columns={[
                { key: "name", label: "Name" },
                { key: "role", label: "Role" },
                { key: "stage", label: "Stage" },
                { key: "source", label: "Source" },
                { key: "label", label: "Status" }
              ]}
              sample={"Asha Verma,Talent Specialist,Screening,Direct ATS,Imported"}
              onImport={importCandidatesAction}
              onImported={reload}
            />
          </div>
        </div>
        <table className="data-table">
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
              <th><button className="table-sort" onClick={() => toggleSort("name")} type="button">Name</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("role")} type="button">Role</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("stage")} type="button">Stage</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("source")} type="button">Source</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("label")} type="button">Decision</button></th>
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
                <td>{candidate.name}</td>
                <td>{candidate.role}</td>
                <td>
                  <select
                    aria-label={`Update stage for ${candidate.name}`}
                    className="table-select"
                    disabled={savingCandidateKey === `${candidate.id}:stage`}
                    value={candidate.stage || ""}
                    onChange={(event) => updateCandidateInline(candidate, "stage", event.target.value)}
                  >
                    {candidateStageOptions(candidate.stage).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`Update source for ${candidate.name}`}
                    className="table-select"
                    disabled={savingCandidateKey === `${candidate.id}:source`}
                    value={candidate.source || ""}
                    onChange={(event) => updateCandidateInline(candidate, "source", event.target.value)}
                  >
                    {candidateSourceOptions(candidate.source).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`Update decision for ${candidate.name}`}
                    className="table-select decision-select"
                    disabled={savingCandidateKey === `${candidate.id}:status`}
                    value={candidate.label || candidate.status || candidate.stage || ""}
                    onChange={(event) => updateCandidateInline(candidate, "status", event.target.value)}
                  >
                    {candidateStatusOptions(candidate.label || candidate.status || candidate.stage).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="row-actions">
                    <Link
                      aria-label={`View ${candidate.name}`}
                      className="mini-button table-icon-button"
                      href={`/candidates/${candidate.id}`}
                      onClick={() => rememberCandidateForDetail(candidate)}
                      title="View"
                    >
                      👁️
                    </Link>
                    <button
                      aria-label={`Edit ${candidate.name}`}
                      className="mini-button table-icon-button"
                      onClick={() => {
                        setEditState({
                          ...candidate,
                          label: candidate.label || candidate.status || "Sourced",
                          stage: candidate.stage || "Sourcing",
                          source: candidate.source || "Portal-Naukri",
                          recruiterName: candidate.recruiterName || "Harish",
                          businessUnit: candidate.businessUnit || "Talme",
                          department: candidate.department || "Talme",
                          phone: candidate.phone || "",
                          jobId: candidate.jobId || "",
                          recruiterId: candidate.recruiterId || "",
                          domain: candidate.domain || "",
                          client: candidate.client || "",
                          sourceDate: candidate.sourceDate || "",
                          screeningDate: candidate.screeningDate || "",
                          screeningNotes: candidate.screeningNotes || "",
                          noticePeriod: candidate.noticePeriod || "",
                          qualification: candidate.qualification || "",
                          yearsOfExperience: candidate.yearsOfExperience ?? "",
                          previousCompany: candidate.previousCompany || "",
                          previousCtc: candidate.previousCtc || "",
                          expectedCtc: candidate.expectedCtc || "",
                          location: candidate.location || "",
                          preferredLocation: candidate.preferredLocation || "",
                          resumeFileName: candidate.resumeFileName || "",
                          resumeMimeType: candidate.resumeMimeType || "",
                          resumeDataUrl: candidate.resumeDataUrl || ""
                        });
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
                <td colSpan="7">No matching candidates found.</td>
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
        headerActions={
          <button className="ghost-button cv-header-import-button" onClick={() => cvInputRef.current?.click()} type="button">
            Import from CV
          </button>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const created = await createCandidateAction({
                ...formState,
                yearsOfExperience:
                  formState.yearsOfExperience === "" ? undefined : Number(formState.yearsOfExperience),
                status: formState.status || formState.stage,
                tone: "gold"
              });
              prepend(created);
              await reload();
              setModalOpen(false);
              setCvFileName("");
              setCvImportMessage("");
              setSourceFilter("All");
            });
          }}
        >
          <div className="form-grid">
            <label>
              <span>Name</span>
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Email</span>
              <input
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Role</span>
              <input
                value={formState.role}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, role: event.target.value }))
                }
              />
            </label>
              <label>
                <span>Stage</span>
                <select
                  value={formState.stage}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, stage: event.target.value }))
                  }
                >
                  {candidateStageOptions(formState.stage).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Source</span>
                <select
                  value={formState.source}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, source: event.target.value }))
                  }
                >
                  {candidateSourceOptions(formState.source).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Candidate Current Status</span>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {candidateStatusOptions(formState.status).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Recruiter</span>
                <select
                  value={formState.recruiterName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, recruiterName: event.target.value }))
                  }
                >
                  {candidateDropdownOptions.recruiters.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Business Unit</span>
                <select
                  value={formState.businessUnit}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, businessUnit: event.target.value }))
                  }
                >
                  {candidateDropdownOptions.businessUnit.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Department</span>
                <select
                  value={formState.department}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, department: event.target.value }))
                  }
                >
                {candidateDropdownOptions.department.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            {candidateIntakeFields.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                {field.multiline ? (
                  <textarea
                    value={formState[field.key]}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    rows={3}
                  />
                ) : field.key === "jobId" ? (
                  <select
                    value={formState.jobId}
                    onChange={(event) =>
                      setFormState((current) => applyJobOpeningDetails(current, event.target.value))
                    }
                  >
                    <option value="">Select Job ID</option>
                    {formState.jobId && !jobOpeningOptions.some((opening) => opening.jobId === formState.jobId) ? (
                      <option value={formState.jobId}>{formState.jobId}</option>
                    ) : null}
                    {jobOpeningOptions.map((opening) => (
                      <option key={opening.id || opening.jobId} value={opening.jobId}>
                        {jobOpeningOptionLabel(opening)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || "text"}
                    value={formState[field.key]}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                )}
              </label>
            ))}
            {candidateProfileFields.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                <input
                  step={field.step}
                  type={field.type || "text"}
                  value={formState[field.key]}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
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
          {cvImportMessage ? <p className="cv-import-note">{cvImportMessage}</p> : null}
          <div className="modal-actions">
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
                const updated = await updateCandidateAction(editState.id, {
                  name: editState.name,
                  email: editState.email,
                  role: editState.role,
                  stage: editState.stage,
                  source: editState.source,
                  recruiterName: editState.recruiterName,
                  businessUnit: editState.businessUnit,
                  department: editState.department,
                  phone: editState.phone,
                  jobId: editState.jobId,
                  recruiterId: editState.recruiterId,
                  domain: editState.domain,
                  client: editState.client,
                  sourceDate: editState.sourceDate,
                  screeningDate: editState.screeningDate,
                  screeningNotes: editState.screeningNotes,
                  noticePeriod: editState.noticePeriod,
                  qualification: editState.qualification,
                  yearsOfExperience:
                    editState.yearsOfExperience === "" ? undefined : Number(editState.yearsOfExperience),
                  previousCompany: editState.previousCompany,
                  previousCtc: editState.previousCtc,
                  expectedCtc: editState.expectedCtc,
                  location: editState.location,
                  preferredLocation: editState.preferredLocation,
                  resumeFileName: editState.resumeFileName,
                  resumeMimeType: editState.resumeMimeType,
                  resumeDataUrl: editState.resumeDataUrl,
                  status: editState.label,
                  tone: editState.tone
                });
                replace(editState.id, updated);
                await reload();
                setEditModalOpen(false);
                setEditState(null);
              });
            }}
          >
            <div className="form-grid">
              <label>
                <span>Name</span>
                <input
                  value={editState.name}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  value={editState.email ?? ""}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Role</span>
                <input
                  value={editState.role}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, role: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Stage</span>
                <select
                  value={editState.stage}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, stage: event.target.value }))
                  }
                >
                  {candidateStageOptions(editState.stage).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Source</span>
                <select
                  value={editState.source}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, source: event.target.value }))
                  }
                >
                  {candidateSourceOptions(editState.source).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Candidate Current Status</span>
                <select
                  value={editState.label || editState.status || editState.stage}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, label: event.target.value }))
                  }
                >
                  {candidateStatusOptions(editState.label || editState.status || editState.stage).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Recruiter</span>
                <select
                  value={editState.recruiterName || "Harish"}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, recruiterName: event.target.value }))
                  }
                >
                  {candidateDropdownOptions.recruiters.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Business Unit</span>
                <select
                  value={editState.businessUnit || "Talme"}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, businessUnit: event.target.value }))
                  }
                >
                  {candidateDropdownOptions.businessUnit.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Department</span>
                <select
                  value={editState.department || "Talme"}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, department: event.target.value }))
                  }
                >
                  {candidateDropdownOptions.department.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              {candidateIntakeFields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  {field.multiline ? (
                    <textarea
                      value={editState[field.key] ?? ""}
                      onChange={(event) =>
                        setEditState((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      rows={3}
                    />
                  ) : field.key === "jobId" ? (
                    <select
                      value={editState.jobId ?? ""}
                      onChange={(event) =>
                        setEditState((current) => applyJobOpeningDetails(current, event.target.value))
                      }
                    >
                      <option value="">Select Job ID</option>
                      {editState.jobId && !jobOpeningOptions.some((opening) => opening.jobId === editState.jobId) ? (
                        <option value={editState.jobId}>{editState.jobId}</option>
                      ) : null}
                      {jobOpeningOptions.map((opening) => (
                        <option key={opening.id || opening.jobId} value={opening.jobId}>
                          {jobOpeningOptionLabel(opening)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      value={editState[field.key] ?? ""}
                      onChange={(event) =>
                        setEditState((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                    />
                  )}
                </label>
              ))}
              {candidateProfileFields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    step={field.step}
                    type={field.type || "text"}
                    value={editState[field.key] ?? ""}
                    onChange={(event) =>
                      setEditState((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
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
