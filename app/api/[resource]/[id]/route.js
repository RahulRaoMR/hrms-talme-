import { createActivityLog, deleteResource, getResource, updateResource } from "@/lib/local-api-store";
import {
  createPersistentAuditLog,
  deletePersistentResource,
  getPersistentResource,
  hasPersistentDatabase,
  updatePersistentResource
} from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";
import { sendLeaveStatusNotification } from "@/lib/leave-notifications";
import { buildAuditDetail, getAuditActorFromRequest, getAuditEntity } from "@/lib/audit-format";

function shouldUseLocalMutationFallback() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_EPHEMERAL_API_STORE === "true";
}

function missingPersistentStoreResponse() {
  return Response.json(
    {
      error:
        "Persistent API storage is not configured. Set NEXT_PUBLIC_API_URL/API_BASE_URL to the backend URL, or set DATABASE_URL to a PostgreSQL database."
    },
    { status: 503 }
  );
}

async function attachLeaveNotification(resource, previousRow, nextRow) {
  if (resource !== "leave-requests" || !nextRow) {
    return nextRow;
  }

  const leaveNotification = await sendLeaveStatusNotification(previousRow, nextRow);
  return { ...nextRow, leaveNotification };
}

async function writeAuditEntry(request, action, resource, row, id) {
  const payload = {
    actor: getAuditActorFromRequest(request),
    action,
    entity: getAuditEntity(resource),
    entityId: row?.id || id || "",
    detail: buildAuditDetail(action, resource, row, id)
  };

  const persistentLog = await createPersistentAuditLog(payload);
  if (!persistentLog) createActivityLog(payload);
}

export async function GET(request, context) {
  const { resource, id } = await context.params;
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}${new URL(request.url).search}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const persistentRow = await getPersistentResource(resource, id);

  if (persistentRow) {
    return Response.json(persistentRow);
  }

  const rows = getResource(resource);
  const row = rows?.find((item) => String(item.id) === String(id));

  if (!row) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  return Response.json(row);
}

export async function PATCH(request, context) {
  const { resource, id } = await context.params;

  let payload;

  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  if (hasPersistentDatabase) {
    payload = await request.json().catch(() => ({}));
    const previousRow = await getPersistentResource(resource, id);
    const persistentRow = await updatePersistentResource(resource, id, payload);

    if (persistentRow) {
      await writeAuditEntry(request, "UPDATE", resource, persistentRow, id);
      return Response.json(await attachLeaveNotification(resource, previousRow, persistentRow));
    }
  }

  if (!shouldUseLocalMutationFallback()) {
    return missingPersistentStoreResponse();
  }

  payload ||= await request.json().catch(() => ({}));
  const previousRow = getResource(resource)?.find((item) => String(item.id) === String(id));
  const row = updateResource(resource, id, payload);

  if (!row) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  await writeAuditEntry(request, "UPDATE", resource, row, id);
  return Response.json(await attachLeaveNotification(resource, previousRow, row));
}

export async function DELETE(request, context) {
  const { resource, id } = await context.params;
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const persistentRow = await deletePersistentResource(resource, id);

  if (persistentRow) {
    await writeAuditEntry(request, "DELETE", resource, persistentRow, id);
    return Response.json(persistentRow);
  }

  if (!shouldUseLocalMutationFallback()) {
    return missingPersistentStoreResponse();
  }

  const existing = getResource(resource)?.find((item) => String(item.id) === String(id));

  if (!deleteResource(resource, id)) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  await writeAuditEntry(request, "DELETE", resource, existing, id);
  return Response.json({ id });
}
