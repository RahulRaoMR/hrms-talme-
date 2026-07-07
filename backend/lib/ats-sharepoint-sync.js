const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const DEFAULT_IMPORT_INTERVAL_MS = 60000;
const WEBSITE_ID_HEADER = "Website Record ID";

const ATS_RESOURCE_ALIASES = new Map([
  ["candidates", "candidates"],
  ["job-openings", "job-openings"],
  ["jobOpenings", "job-openings"]
]);

const requirementColumns = [
  { header: "Job ID", key: "jobId" },
  { header: "Aging", key: "agingDays", type: "int" },
  { header: "Type of Hire", key: "hireType" },
  { header: "Job Posted Date", key: "postedDate", type: "date" },
  { header: "Business Unit", key: "businessUnit" },
  { header: "Department", key: "department" },
  { header: "Client", key: "client" },
  { header: "Domain", key: "domain" },
  { header: "Position", key: "position" },
  { header: "Priority", key: "priority" },
  { header: "Number of Openings", key: "numberOfOpenings", type: "int" },
  { header: "Position Current Status", key: "status" },
  { header: "Remarks", key: "remarks" },
  { header: "Candidate Concerned", key: "candidateConcerned" },
  { header: "Date of Hold", key: "holdDate", type: "date" },
  { header: "Date of Offer Stage", key: "offerStageDate", type: "date" },
  { header: "Date of Offer", key: "offerDate", type: "date" },
  { header: "Date of Joining", key: "joiningDate", type: "date" },
  { header: "CTC of Candidate", key: "candidateCtc" },
  { header: "Source", key: "source" },
  { header: "Harmonized Role", key: "harmonizedRole" },
  { header: "Recruiter tagged", key: "recruiterTagged" },
  { header: "Original Job Post Date", key: "originalJobPostDate", type: "date" },
  { header: WEBSITE_ID_HEADER, key: "id" }
];

const candidateColumns = [
  { header: "Job Id", key: "jobId" },
  { header: "Recruiter Id", key: "recruiterId" },
  { header: "Recruiter Name", key: "recruiterName" },
  { header: "Business Unit", key: "businessUnit" },
  { header: "Domain", key: "domain", occurrence: 1 },
  { header: "Domain", key: "role", occurrence: 2, fallbackHeaders: ["Position"] },
  { header: "Client", key: "client" },
  { header: "Candidate Name", key: "name" },
  { header: "Notice Period", key: "noticePeriod" },
  { header: "Candidate Email", key: "email" },
  { header: "Phone No.", key: "phone" },
  { header: "Qualification", key: "qualification" },
  { header: "Years of Exp", key: "yearsOfExperience", type: "float" },
  { header: "Previous Company", key: "previousCompany" },
  { header: "Previous CTC", key: "previousCtc" },
  { header: "Location", key: "location" },
  { header: "Prefered Location", key: "preferredLocation" },
  { header: "Expected CTC", key: "expectedCtc" },
  { header: "Candidate Current Status", key: "status" },
  { header: "Source", key: "source" },
  { header: "Source Date", key: "sourceDate", type: "date" },
  { header: "Screening Date", key: "screeningDate", type: "date" },
  { header: "Screening Notes", key: "screeningNotes" },
  { header: "Tech 1 date", key: "tech1Date", type: "date" },
  { header: "Tech 1 Status", key: "tech1Status" },
  { header: "Tech 1 Remarks", key: "tech1Remarks" },
  { header: "Tech 1 Panel", key: "tech1Panel" },
  { header: "Tech 2 date", key: "tech2Date", type: "date" },
  { header: "Tech 2 Status", key: "tech2Status" },
  { header: "Tech 2 Remarks", key: "tech2Remarks" },
  { header: "Tech 2 Panel", key: "tech2Panel" },
  { header: "Tech 3 date", key: "tech3Date", type: "date" },
  { header: "Tech 3 Status", key: "tech3Status" },
  { header: "Tech 3 Remarks", key: "tech3Remarks" },
  { header: "Tech 3 Panel", key: "tech3Panel" },
  { header: "Offer Stage Input date", key: "offerStageInputDate", type: "date" },
  { header: "Date of Document Collection", key: "documentCollectionDate", type: "date" },
  { header: "Date of Approval", key: "approvalDate", type: "date" },
  { header: "Offer Date", key: "offerDate", type: "date" },
  { header: "Offer Status", key: "offerStatus" },
  { header: "Date of Offer Accept/Reject", key: "offerDecisionDate", type: "date" },
  { header: "Offer Accept Status", key: "offerAcceptStatus" },
  { header: "Date Of Joining", key: "joiningDate", type: "date" },
  { header: "Joining Status", key: "joiningStatus" },
  { header: "CTC Offered", key: "offeredCtc" },
  { header: WEBSITE_ID_HEADER, key: "id" }
];

let tokenCache = null;
let workbookTargetCache = null;
let importPromise = null;
let exportPromise = Promise.resolve();
let lastImportAt = 0;

function cleanEnv(value) {
  return String(value || "").trim().replace(/^"|"$/g, "");
}

function getConfig() {
  return {
    enabled: cleanEnv(process.env.ATS_SHAREPOINT_SYNC_ENABLED).toLowerCase() === "true",
    tenantId: cleanEnv(process.env.MICROSOFT_TENANT_ID),
    clientId: cleanEnv(process.env.MICROSOFT_CLIENT_ID),
    clientSecret: cleanEnv(process.env.MICROSOFT_CLIENT_SECRET),
    workbookUrl: cleanEnv(process.env.ATS_SHAREPOINT_WORKBOOK_URL),
    driveId: cleanEnv(process.env.ATS_SHAREPOINT_DRIVE_ID),
    itemId: cleanEnv(process.env.ATS_SHAREPOINT_ITEM_ID),
    requirementSheet: cleanEnv(process.env.ATS_SHAREPOINT_REQUIREMENTS_SHEET) || "Requirement Overview",
    candidateSheet: cleanEnv(process.env.ATS_SHAREPOINT_CANDIDATES_SHEET) || "Candidate Master",
    importIntervalMs:
      Number.parseInt(cleanEnv(process.env.ATS_SHAREPOINT_IMPORT_INTERVAL_MS), 10) || DEFAULT_IMPORT_INTERVAL_MS
  };
}

export function isAtsSharePointResource(resource) {
  return ATS_RESOURCE_ALIASES.has(resource);
}

export function getAtsSharePointSyncStatus() {
  const config = getConfig();
  const missing = [];

  if (!config.enabled) missing.push("ATS_SHAREPOINT_SYNC_ENABLED=true");
  if (!config.tenantId) missing.push("MICROSOFT_TENANT_ID");
  if (!config.clientId) missing.push("MICROSOFT_CLIENT_ID");
  if (!config.clientSecret) missing.push("MICROSOFT_CLIENT_SECRET");
  if (!config.workbookUrl && (!config.driveId || !config.itemId)) {
    missing.push("ATS_SHAREPOINT_WORKBOOK_URL or ATS_SHAREPOINT_DRIVE_ID/ATS_SHAREPOINT_ITEM_ID");
  }

  return {
    enabled: missing.length === 0,
    configured: config.enabled,
    missing,
    workbookUrl: config.workbookUrl ? "configured" : "",
    requirementSheet: config.requirementSheet,
    candidateSheet: config.candidateSheet,
    lastImportAt
  };
}

export async function maybeImportAtsFromSharePoint(prisma, options = {}) {
  const status = getAtsSharePointSyncStatus();
  const now = Date.now();

  if (!status.enabled) {
    return { skipped: true, reason: "SharePoint ATS sync is not configured.", status };
  }

  if (!options.force && now - lastImportAt < getConfig().importIntervalMs) {
    return { skipped: true, reason: "Import throttle active.", status };
  }

  if (!importPromise) {
    importPromise = importAtsFromSharePoint(prisma)
      .finally(() => {
        importPromise = null;
      });
  }

  return importPromise;
}

export function queueAtsSharePointExport(prisma, resource) {
  const normalizedResource = ATS_RESOURCE_ALIASES.get(resource);

  if (!normalizedResource || !getAtsSharePointSyncStatus().enabled) {
    return;
  }

  exportPromise = exportPromise
    .catch(() => undefined)
    .then(() => exportAtsResourceToSharePoint(prisma, normalizedResource))
    .catch((error) => {
      console.error(`SharePoint ATS ${normalizedResource} export failed:`, error);
    });
}

export async function exportAtsToSharePoint(prisma) {
  if (!getAtsSharePointSyncStatus().enabled) {
    return { skipped: true, reason: "SharePoint ATS sync is not configured." };
  }

  const [jobOpenings, candidates] = await Promise.all([
    exportAtsResourceToSharePoint(prisma, "job-openings"),
    exportAtsResourceToSharePoint(prisma, "candidates")
  ]);

  return { jobOpenings, candidates };
}

export async function exportAtsResourceToSharePoint(prisma, resource) {
  const config = getConfig();
  const normalizedResource = ATS_RESOURCE_ALIASES.get(resource) || resource;

  if (!getAtsSharePointSyncStatus().enabled) {
    return { skipped: true, reason: "SharePoint ATS sync is not configured." };
  }

  if (normalizedResource === "job-openings") {
    const rows = await prisma.jobOpening.findMany({ orderBy: { postedDate: "desc" } });
    await writeSheetValues(config.requirementSheet, buildSheetValues(requirementColumns, rows));
    return { resource: normalizedResource, count: rows.length };
  }

  if (normalizedResource === "candidates") {
    const rows = await prisma.candidate.findMany({ orderBy: { createdAt: "desc" } });
    await writeSheetValues(config.candidateSheet, buildSheetValues(candidateColumns, rows));
    return { resource: normalizedResource, count: rows.length };
  }

  return { skipped: true, reason: `Unsupported ATS resource ${resource}.` };
}

async function importAtsFromSharePoint(prisma) {
  const config = getConfig();
  const requirementValues = await readSheetValues(config.requirementSheet);
  const candidateValues = await readOptionalSheetValues(config.candidateSheet);

  const jobOpenings = transformRows(requirementValues.values, requirementColumns)
    .map(toJobOpeningData)
    .filter((item) => item.jobId && item.position);
  const candidates = transformRows(candidateValues?.values, candidateColumns)
    .map(toCandidateData)
    .filter((item) => item.name && item.role);

  for (const jobOpening of uniqueBy(jobOpenings, "jobId")) {
    const { id: _id, ...data } = jobOpening;
    await prisma.jobOpening.upsert({
      where: { jobId: data.jobId },
      update: data,
      create: data
    });
  }

  let createdCandidates = 0;
  let updatedCandidates = 0;

  for (const candidate of candidates) {
    const existing = await findExistingCandidate(prisma, candidate);
    const { id, ...data } = candidate;

    if (existing) {
      await prisma.candidate.update({ where: { id: existing.id }, data });
      updatedCandidates += 1;
    } else {
      await prisma.candidate.create({ data });
      createdCandidates += 1;
    }
  }

  lastImportAt = Date.now();

  return {
    imported: true,
    jobOpenings: jobOpenings.length,
    candidates: candidates.length,
    skippedCandidateSheet: !candidateValues,
    createdCandidates,
    updatedCandidates
  };
}

async function findExistingCandidate(prisma, candidate) {
  if (candidate.id) {
    const byId = await prisma.candidate.findUnique({ where: { id: candidate.id } }).catch(() => null);
    if (byId) return byId;
  }

  const or = [];

  if (candidate.email) {
    or.push({ email: { equals: candidate.email, mode: "insensitive" } });
  }

  if (candidate.phone && candidate.name) {
    or.push({
      AND: [
        { phone: candidate.phone },
        { name: { equals: candidate.name, mode: "insensitive" } }
      ]
    });
  }

  if (candidate.name && candidate.jobId && candidate.role) {
    or.push({
      AND: [
        { name: { equals: candidate.name, mode: "insensitive" } },
        { jobId: candidate.jobId },
        { role: { equals: candidate.role, mode: "insensitive" } }
      ]
    });
  }

  if (!or.length) return null;

  return prisma.candidate.findFirst({ where: { OR: or } });
}

function buildSheetValues(columns, rows) {
  return [
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => formatCellValue(row[column.key])))
  ];
}

function transformRows(values, columns) {
  if (!Array.isArray(values) || values.length < 2) return [];

  const sourceHeaders = values[0].map(normalizeHeader);
  const headerIndexes = buildHeaderIndexes(sourceHeaders);

  return values.slice(1).map((row) =>
    columns.reduce((record, column) => {
      const index = findHeaderIndex(headerIndexes, column);

      if (index !== undefined) {
        record[column.key] = coerceImportValue(row[index], column.type);
      }

      return record;
    }, {})
  );
}

function buildHeaderIndexes(headers) {
  return headers.reduce((indexes, header, index) => {
    if (!indexes.has(header)) {
      indexes.set(header, []);
    }

    indexes.get(header).push(index);
    return indexes;
  }, new Map());
}

function findHeaderIndex(headerIndexes, column) {
  const headers = [column.header, ...(column.fallbackHeaders || [])];

  for (const header of headers) {
    const matches = headerIndexes.get(normalizeHeader(header)) || [];
    const index = matches[(column.occurrence || 1) - 1] ?? matches[0];

    if (index !== undefined) {
      return index;
    }
  }

  return undefined;
}

function toJobOpeningData(row) {
  const status = row.status || "";

  return stripUndefined({
    ...row,
    agingDays: normalizeInt(row.agingDays),
    numberOfOpenings: normalizeInt(row.numberOfOpenings),
    postedDate: excelDate(row.postedDate),
    holdDate: excelDate(row.holdDate),
    offerStageDate: excelDate(row.offerStageDate),
    offerDate: excelDate(row.offerDate),
    joiningDate: excelDate(row.joiningDate),
    originalJobPostDate: excelDate(row.originalJobPostDate),
    tone: toneFromStatus(status)
  });
}

function toCandidateData(row) {
  const status = row.status || "Pipeline";

  return stripUndefined({
    ...row,
    stage: stageFromStatus(status),
    status,
    yearsOfExperience: normalizeFloat(row.yearsOfExperience),
    sourceDate: excelDate(row.sourceDate),
    screeningDate: excelDate(row.screeningDate),
    tech1Date: excelDate(row.tech1Date),
    tech2Date: excelDate(row.tech2Date),
    tech3Date: excelDate(row.tech3Date),
    offerStageInputDate: excelDate(row.offerStageInputDate),
    documentCollectionDate: excelDate(row.documentCollectionDate),
    approvalDate: excelDate(row.approvalDate),
    offerDate: excelDate(row.offerDate),
    offerDecisionDate: excelDate(row.offerDecisionDate),
    joiningDate: excelDate(row.joiningDate),
    tone: toneFromStatus(status)
  });
}

function stripUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").trim().replace(/\s+/g, " ");
}

function normalizeInt(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = Number.parseInt(Number.parseFloat(text), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFloat(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceImportValue(value, type) {
  if (type === "int") return normalizeInt(value);
  if (type === "float") return normalizeFloat(value);
  if (type === "date") return excelDate(value);
  return normalizeText(value);
}

function excelDate(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const serial = Number.parseFloat(text);

  if (!Number.isFinite(serial) || serial <= 0) {
    return text;
  }

  const base = Date.UTC(1899, 11, 30);
  const date = new Date(base + serial * 86400000);
  return date.toISOString().slice(0, 10);
}

function toneFromStatus(status) {
  const lower = normalizeText(status).toLowerCase();
  const positiveTokens = ["joined", "offer accepted", "offered", "selected"];
  const terminalTokens = ["reject", "hold", "closed", "drop", "no show", "not interested"];

  if (positiveTokens.some((token) => lower.includes(token))) return "teal";
  if (terminalTokens.some((token) => lower.includes(token))) return "slate";
  return "gold";
}

function stageFromStatus(status) {
  const lower = normalizeText(status).toLowerCase();

  if (!lower) return "Pipeline";
  if (lower.includes("joined") || lower.includes("joining")) return "Joining";
  if (lower.includes("offer") || lower.includes("document") || lower.includes("approval")) return "Offer";
  if (lower.includes("tech 3")) return "Tech 3";
  if (lower.includes("tech 2")) return "Tech 2";
  if (lower.includes("tech 1")) return "Tech 1";
  if (lower.includes("screen")) return "Screening";
  if (lower.includes("source") || lower.includes("yet to screen")) return "Sourcing";
  if (lower.includes("feedback")) return "Client Feedback";
  return "Pipeline";
}

function uniqueBy(items, key) {
  const seen = new Set();

  return items.filter((item) => {
    const value = item[key];
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

async function readSheetValues(sheetName) {
  const target = await getWorkbookTarget();
  const sheetPath = workbookSheetPath(target, sheetName);
  const payload = await graphRequest(`${sheetPath}/usedRange(valuesOnly=true)`);

  return {
    address: payload.address,
    values: payload.values || []
  };
}

async function readOptionalSheetValues(sheetName) {
  if (!sheetName) return null;

  return readSheetValues(sheetName).catch((error) => {
    console.warn(`SharePoint ATS sheet "${sheetName}" was skipped: ${error.message}`);
    return null;
  });
}

async function writeSheetValues(sheetName, values) {
  const target = await getWorkbookTarget();
  const sheetPath = workbookSheetPath(target, sheetName);

  if (!values.length || !values[0]?.length) return;

  const existing = await graphRequest(`${sheetPath}/usedRange(valuesOnly=true)`).catch(() => null);
  const existingAddress = extractRangeAddress(existing?.address);

  if (existingAddress) {
    await graphRequest(`${sheetPath}/range(address='${escapeODataString(existingAddress)}')/clear`, {
      method: "POST",
      body: { applyTo: "Contents" }
    });
  }

  const address = `A1:${columnName(values[0].length)}${values.length}`;
  await graphRequest(`${sheetPath}/range(address='${escapeODataString(address)}')`, {
    method: "PATCH",
    body: { values }
  });
}

function workbookSheetPath(target, sheetName) {
  return `/drives/${target.driveId}/items/${target.itemId}/workbook/worksheets/${encodeURIComponent(sheetName)}`;
}

function extractRangeAddress(address) {
  if (!address) return "";
  return String(address).split("!").pop().replace(/\$/g, "");
}

function columnName(count) {
  let value = count;
  let output = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }

  return output;
}

function escapeODataString(value) {
  return String(value).replace(/'/g, "''");
}

async function getWorkbookTarget() {
  const config = getConfig();

  if (workbookTargetCache) {
    return workbookTargetCache;
  }

  if (config.driveId && config.itemId) {
    workbookTargetCache = { driveId: config.driveId, itemId: config.itemId };
    return workbookTargetCache;
  }

  const shareId = `u!${Buffer.from(config.workbookUrl)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")}`;
  const item = await graphRequest(`/shares/${shareId}/driveItem?$select=id,parentReference`);

  workbookTargetCache = {
    driveId: item.parentReference?.driveId,
    itemId: item.id
  };

  if (!workbookTargetCache.driveId || !workbookTargetCache.itemId) {
    throw new Error("Unable to resolve SharePoint workbook drive/item id.");
  }

  return workbookTargetCache;
}

async function getAccessToken() {
  const config = getConfig();

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: GRAPH_SCOPE
  });
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || `Microsoft token request failed with ${response.status}`);
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3000) * 1000
  };

  return tokenCache.accessToken;
}

async function graphRequest(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message || `Microsoft Graph request failed with ${response.status}`);
  }

  return payload;
}
