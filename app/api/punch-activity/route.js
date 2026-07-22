import { createActivityLog, createResource, getResource } from "@/lib/local-api-store";
import { createPersistentAuditLog, hasPersistentDatabase, prisma } from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";

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
    month: String(searchParams.get("month") || "").trim()
  };
}

function filterPunchRows(rows, filters) {
  return rows.filter((row) => {
    const rowEmployeeId = String(row.employeeId || "").trim().toLowerCase();
    const rowWorkDate = String(row.workDate || "").trim();

    if (filters.employeeId && rowEmployeeId !== filters.employeeId) return false;
    if (filters.workDate && rowWorkDate !== filters.workDate) return false;
    if (!filters.workDate && /^\d{4}-\d{2}$/.test(filters.month) && !rowWorkDate.startsWith(filters.month)) return false;

    return true;
  });
}

function sortPunchRows(rows = []) {
  return [...rows].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

export async function GET(request) {
  const filters = normalizeFilterParams(request);

  if (hasPersistentDatabase) {
    const where = {};

    if (filters.employeeId) {
      where.employeeId = { equals: filters.employeeId, mode: "insensitive" };
    }

    if (filters.workDate) {
      where.workDate = filters.workDate;
    } else if (/^\d{4}-\d{2}$/.test(filters.month)) {
      where.workDate = { startsWith: filters.month };
    }

    const rows = await prisma.punchActivity.findMany({
      where,
      orderBy: { timestamp: "desc" }
    });

    return Response.json(rows);
  }

  const proxiedResponse = await proxyToConfiguredApi(request, `/api/punch-activity${new URL(request.url).search}`);

  if (proxiedResponse?.ok) {
    return proxiedResponse;
  }

  return Response.json(filterPunchRows(getResource("punch-activity") || [], filters));
}

export async function POST(request) {
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

  const data = {
    employeeId,
    employeeName: payload.employeeName ? String(payload.employeeName).trim() : undefined,
    type,
    timestamp: timestamp.toISOString(),
    time: String(payload.time || "").trim() || formatPunchTime(timestamp),
    workDate: String(payload.workDate || "").trim() || formatStorageDate(timestamp),
    geoCoordinates: payload.geoCoordinates || undefined
  };

  if (hasPersistentDatabase) {
    const latestSameDayPunch = await prisma.punchActivity.findFirst({
      where: {
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
  }

  const proxyRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(payload)
  });
  const proxiedResponse = await proxyToConfiguredApi(proxyRequest, "/api/punch-activity");

  if (proxiedResponse?.ok) {
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
