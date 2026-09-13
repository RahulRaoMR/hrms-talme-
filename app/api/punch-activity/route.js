import { handlePunchRequest, resolvePunchUser } from "@/lib/punch-request-handler";
import { scopedEmployee, submitManualPunch } from "@/backend/lib/punch-regularization";
import { createActivityLog, createResource, getResource } from "@/lib/local-api-store";
import { createPersistentAuditLog, hasPersistentDatabase, prisma } from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";
import {
  isMissingPunchActivityRegularizationColumn,
  punchActivityRegularizationMigrationMessage
} from "@/backend/lib/punch-activity-schema";

function formatStorageDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPunchTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date).toLowerCase();
}

async function writePunchAudit(request, row) {
  const payload = {
    actor: request.headers.get("x-talme-actor") || row.employeeId || "system",
    action: row.type,
    entity: "Punch Activity",
    entityId: row.employeeId || "",
    detail: `${row.type} by ${row.employeeName || row.employeeId} at ${row.time || row.timestamp}`
  };

  const persistentLog = await createPersistentAuditLog(payload);
  if (!persistentLog) createActivityLog(payload);
}

function normalizeFilterParams(request) {
  const { searchParams } = new URL(request.url);

  return {
    employeeId: String(searchParams.get("employeeId") || "").trim().toLowerCase(),
    workDate: String(searchParams.get("date") || searchParams.get("workDate") || "").trim(),
    month: String(searchParams.get("month") || "").trim(),
    regularizationStatus: String(searchParams.get("regularizationStatus") || "").trim().toLowerCase()
  };
}

function filterPunchRows(rows, filters) {
  return rows.filter((row) => {
    const rowEmployeeId = String(row.employeeId || "").trim().toLowerCase();
    const rowWorkDate = String(row.workDate || "").trim();
    const rowRegularizationStatus = String(row.regularizationStatus || "").trim().toLowerCase();

    if (filters.employeeId && rowEmployeeId !== filters.employeeId) return false;
    if (filters.workDate && rowWorkDate !== filters.workDate) return false;
    if (!filters.workDate && /^\d{4}-\d{2}$/.test(filters.month) && !rowWorkDate.startsWith(filters.month)) return false;
    if (filters.regularizationStatus && rowRegularizationStatus !== filters.regularizationStatus) return false;

    return true;
  });
}

function sortPunchRows(rows = []) {
  return [...rows].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

function migrationRequiredResponse() {
  return Response.json({ error: punchActivityRegularizationMigrationMessage }, { status: 503 });
}

export function GET(request) {
  return handlePunchRequest(request, async (db, user) => {
    const filters = normalizeFilterParams(request);
    const employeeId = scopedEmployee(user, filters.employeeId);
    return db.punchActivity.findMany({
      where: {
        ...(employeeId ? { employeeId: { equals: employeeId, mode: "insensitive" } } : {}),
        ...(filters.workDate ? { workDate: filters.workDate } : /^\d{4}-\d{2}$/.test(filters.month) ? { workDate: { startsWith: filters.month } } : {}),
        ...(filters.regularizationStatus ? { regularizationStatus: { equals: filters.regularizationStatus, mode: "insensitive" } } : {})
      },
      orderBy: { timestamp: "desc" }
    });
  });
}

export async function POST(request) {
  const originalRequest = request.clone();
  const payload = await request.json().catch(() => ({}));
  const timestamp = new Date(payload.timestamp || Date.now());
  const employeeId = String(payload.employeeId || "").trim();
  const type = String(payload.type || "").trim();

  if (!employeeId) {
    return Response.json({ error: "Employee ID is required." }, { status: 400 });
  }

  if (!["Punch In", "Punch Out"].includes(type)) {
    return Response.json({ error: "Punch type must be Punch In or Punch Out." }, { status: 400 });
  }

  if (Number.isNaN(timestamp.getTime())) {
    return Response.json({ error: "Punch timestamp is invalid." }, { status: 400 });
  }

  const reason = payload.reason ? String(payload.reason).trim() : "";
  const regularizationStatus = reason || payload.regularizationStatus ? "Pending" : "";
  const data = {
    employeeId,
    employeeName: payload.employeeName ? String(payload.employeeName).trim() : undefined,
    type,
    timestamp: timestamp.toISOString(),
    time: String(payload.time || "").trim() || formatPunchTime(timestamp),
    workDate: String(payload.workDate || "").trim() || formatStorageDate(timestamp),
    geoCoordinates: payload.geoCoordinates || undefined
  };
  const manualEntry = Boolean(payload.manualEntry);

  if (manualEntry || regularizationStatus) {
    return handlePunchRequest(originalRequest, async (db, user) => {
      const result = await submitManualPunch(db, user, { ...data, timestamp }, reason);
      return result.row;
    });
  }
  try {
    scopedEmployee(await resolvePunchUser(request), employeeId);
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 401 });
  }

  if (hasPersistentDatabase) {
    try {
      const latestSameDayPunch = await prisma.punchActivity.findFirst({
        where: {
          OR: [{ regularizationStatus: null }, { regularizationStatus: "" }, { regularizationStatus: "Accepted" }],
          employeeId: { equals: data.employeeId, mode: "insensitive" },
          workDate: data.workDate
        },
        orderBy: { timestamp: "desc" }
      });

      if (latestSameDayPunch?.type === data.type) {
        return Response.json(latestSameDayPunch);
      }

      const existing = await prisma.punchActivity.findFirst({
        where: {
          OR: [{ regularizationStatus: null }, { regularizationStatus: "" }, { regularizationStatus: "Accepted" }],
          employeeId: { equals: data.employeeId, mode: "insensitive" },
          type: data.type,
          timestamp
        }
      });

      if (existing) {
        return Response.json(existing);
      }

      const row = await prisma.punchActivity.create({
        data: {
          ...data,
          employeeName: data.employeeName || null,
          timestamp
        }
      });

      await writePunchAudit(request, row);
      return Response.json(row, { status: 201 });
    } catch (error) {
      if (isMissingPunchActivityRegularizationColumn(error)) {
        return migrationRequiredResponse();
      }

      throw error;
    }
  }

  const proxyRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      ...payload,
      manualEntry
    })
  });
  const proxiedResponse = await proxyToConfiguredApi(proxyRequest, "/api/punch-activity");

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const latestLocalPunch = sortPunchRows(
    filterPunchRows(getResource("punch-activity") || [], {
      employeeId: data.employeeId.toLowerCase(),
      workDate: data.workDate,
      month: ""
    })
  )[0];

  if (latestLocalPunch?.type === data.type) {
    return Response.json(latestLocalPunch);
  }

  const row = createResource("punch-activity", data);

  await writePunchAudit(request, row);
  return Response.json(row, { status: 201 });
}
