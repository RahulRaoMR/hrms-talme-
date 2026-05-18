import { deleteResource, getResource, updateResource } from "@/lib/local-api-store";
import {
  deletePersistentResource,
  getPersistentResource,
  hasPersistentDatabase,
  updatePersistentResource
} from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";
import { sendLeaveStatusNotification } from "@/lib/leave-notifications";

async function attachLeaveNotification(resource, previousRow, nextRow) {
  if (resource !== "leave-requests" || !nextRow) {
    return nextRow;
  }

  const leaveNotification = await sendLeaveStatusNotification(previousRow, nextRow);
  return { ...nextRow, leaveNotification };
}

export async function GET(request, context) {
  const { resource, id } = await context.params;
  const persistentRow = await getPersistentResource(resource, id);

  if (persistentRow) {
    return Response.json(persistentRow);
  }

  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}${new URL(request.url).search}`);

  if (proxiedResponse) {
    return proxiedResponse;
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

  if (hasPersistentDatabase) {
    payload = await request.json().catch(() => ({}));
    const previousRow = await getPersistentResource(resource, id);
    const persistentRow = await updatePersistentResource(resource, id, payload);

    if (persistentRow) {
      return Response.json(await attachLeaveNotification(resource, previousRow, persistentRow));
    }
  }

  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  payload ||= await request.json().catch(() => ({}));
  const previousRow = getResource(resource)?.find((item) => String(item.id) === String(id));
  const row = updateResource(resource, id, payload);

  if (!row) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  return Response.json(await attachLeaveNotification(resource, previousRow, row));
}

export async function DELETE(request, context) {
  const { resource, id } = await context.params;
  const persistentRow = await deletePersistentResource(resource, id);

  if (persistentRow) {
    return Response.json(persistentRow);
  }

  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  if (!deleteResource(resource, id)) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  return Response.json({ id });
}
