import { createActivityLog, deleteResource, getResource, updateResource } from "@/lib/local-api-store";
import { createPersistentAuditLog } from "@/lib/prisma-store";
import { buildAuditDetail, getAuditActorFromRequest, getAuditEntity } from "@/lib/audit-format";

const resource = "shift-assignments";

async function writeAuditEntry(request, action, row, id) {
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

export async function GET(_request, context) {
  const { id } = await context.params;
  const row = (getResource(resource) || []).find((item) => String(item.id) === String(id));

  if (!row) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  return Response.json(row);
}

export async function PATCH(request, context) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const previousRow = (getResource(resource) || []).find((item) => String(item.id) === String(id));
  const row = previousRow
    ? updateResource(resource, id, payload)
    : createResource(resource, { ...payload, id });

  await writeAuditEntry(request, previousRow ? "UPDATE" : "CREATE", row, id);
  return Response.json(row, { status: previousRow ? 200 : 201 });
}

export async function DELETE(request, context) {
  const { id } = await context.params;
  const existing = (getResource(resource) || []).find((item) => String(item.id) === String(id));

  if (!deleteResource(resource, id)) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  await writeAuditEntry(request, "DELETE", existing, id);
  return Response.json({ id });
}
