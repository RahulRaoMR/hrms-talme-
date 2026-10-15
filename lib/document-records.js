const uploadDocumentIdPrefix = "upload-document";

export function uploadedAssetToDocument(asset = {}) {
  const label = formatDocumentLabel(asset.label || asset.fileName || "Document");
  const status = String(asset.status || "Uploaded").trim() || "Uploaded";

  return {
    id: `${uploadDocumentIdPrefix}-${asset.id || stableDocumentKey(asset)}`,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    owner: asset.owner || "Unassigned",
    docType: label,
    module: asset.module || "Employee",
    expiry: asset.expiry || "Uploaded file",
    status,
    tone: documentTone(status),
    uploadId: asset.id,
    fileName: asset.fileName,
    fileUrl: asset.fileUrl
  };
}

export function mergeDocumentRecords(documents = [], assets = []) {
  const rows = [];
  const seen = new Set();

  for (const document of documents || []) {
    addDocument(rows, seen, document);
  }

  for (const asset of assets || []) {
    addDocument(rows, seen, uploadedAssetToDocument(asset));
  }

  return rows;
}

function addDocument(rows, seen, document) {
  if (!document) return;

  const key = stableDocumentKey(document);
  if (seen.has(key)) return;

  rows.push(document);
  seen.add(key);
}

function stableDocumentKey(row = {}) {
  return [
    row.module,
    row.owner,
    row.docType || row.label || row.fileName
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("|");
}

function formatDocumentLabel(value) {
  const raw = String(value || "").trim();

  if (!raw) return "Document";

  return raw
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentTone(status) {
  if (/verified|approved|screened/i.test(status)) return "teal";
  if (/pending|review|expir|missing|queued/i.test(status)) return "gold";
  return "slate";
}
