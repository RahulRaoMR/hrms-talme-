import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createActivityLog, createResource, getResource } from "@/lib/local-api-store";
import { createPersistentAuditLog, createPersistentResource, hasPersistentDatabase, listPersistentResource } from "@/lib/prisma-store";
import { getConfiguredApiBase } from "@/lib/server-api";
import { buildAuditDetail, getAuditActorFromRequest, getAuditEntity } from "@/lib/audit-format";

function shouldUseLocalMutationFallback() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_EPHEMERAL_API_STORE === "true";
}

function missingPersistentStoreResponse() {
  return Response.json(
    {
      error:
        "Persistent upload storage is not configured. Set DATABASE_URL to a PostgreSQL database, or set NEXT_PUBLIC_API_URL/API_BASE_URL to the backend URL."
    },
    { status: 503 }
  );
}

function persistentErrorResponse(error) {
  if (error?.status) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: error?.message || "Unable to save upload details." }, { status: 500 });
}

export async function GET(request) {
  const proxiedResponse = await proxyUploadRequest(request, `/api/uploads${new URL(request.url).search}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const module = new URL(request.url).searchParams.get("module") || "All";
  const persistentRows = await listPersistentResource("uploads");
  const localRows = getResource("uploads") || [];
  const rows = mergeUploadRows(persistentRows || [], localRows);
  const filteredRows = module === "All" ? rows : rows.filter((row) => row.module === module);

  return Response.json(filteredRows);
}

export async function POST(request) {
  const proxiedResponse = await proxyUploadRequest(request, "/api/uploads");

  if (proxiedResponse) {
    return proxiedResponse;
  }

  let payload;

  try {
    payload = await buildUploadPayload(request);
  } catch (error) {
    return Response.json({ error: error?.message || "Unable to upload file." }, { status: error?.status || 400 });
  }

  if (hasPersistentDatabase) {
    const persistentRow = await createPersistentResource("uploads", payload).catch((error) => persistentErrorResponse(error));

    if (persistentRow instanceof Response) {
      return persistentRow;
    }

    if (persistentRow) {
      await writeAuditEntry(request, persistentRow);
      return Response.json(persistentRow, { status: 201 });
    }
  }

  if (!shouldUseLocalMutationFallback()) {
    return missingPersistentStoreResponse();
  }

  const row = createResource("uploads", payload);

  if (!row) {
    return Response.json({ error: "Upload resource is not available." }, { status: 404 });
  }

  await writeAuditEntry(request, row);
  return Response.json(row, { status: 201 });
}

async function writeAuditEntry(request, row) {
  const payload = {
    actor: getAuditActorFromRequest(request),
    action: "UPLOAD",
    entity: getAuditEntity("uploads"),
    entityId: row?.id || "",
    detail: buildAuditDetail("UPLOAD", "uploads", row, row?.id)
  };

  const persistentLog = await createPersistentAuditLog(payload);
  if (!persistentLog) createActivityLog(payload);
}

async function proxyUploadRequest(request, pathName) {
  const baseUrl = getConfiguredApiBase(request);

  if (!baseUrl) return null;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("expect");
  headers.delete("transfer-encoding");

  const method = request.method || "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body,
    redirect: "manual"
  });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

async function buildUploadPayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      const error = new Error("File is required.");
      error.status = 400;
      throw error;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${sanitizeFileName(file.name || "upload")}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), bytes);

    return normalizeUploadPayload({
      module: formData.get("module"),
      owner: formData.get("owner"),
      label: formData.get("label"),
      fileName: file.name,
      fileUrl: `/uploads/${safeName}`,
      mimeType: file.type,
      sizeLabel: formatFileSize(file.size),
      status: formData.get("status")
    });
  }

  return normalizeUploadPayload(await request.json().catch(() => ({})));
}

function normalizeUploadPayload(payload = {}) {
  return {
    module: stringOrDefault(payload.module, "Employee"),
    owner: stringOrDefault(payload.owner, "Unassigned"),
    label: stringOrDefault(payload.label, "Document"),
    fileName: stringOrDefault(payload.fileName, "document"),
    fileUrl: String(payload.fileUrl || ""),
    mimeType: stringOrDefault(payload.mimeType, "document"),
    sizeLabel: stringOrDefault(payload.sizeLabel, "-"),
    status: stringOrDefault(payload.status, "Uploaded")
  };
}

function stringOrDefault(value, fallback) {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function sanitizeFileName(fileName) {
  return String(fileName || "upload").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatFileSize(size = 0) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function mergeUploadRows(...groups) {
  const seen = new Set();
  const rows = [];

  for (const row of groups.flat()) {
    const key = [
      row.id,
      row.module,
      row.owner,
      row.label,
      row.fileName,
      row.fileUrl
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");

    if (!seen.has(key)) {
      rows.push(row);
      seen.add(key);
    }
  }

  return rows;
}
