import { createActivityLog, createResource, getResource } from "@/lib/local-api-store";
import { createPersistentAuditLog } from "@/lib/prisma-store";
import { buildAuditDetail, getAuditActorFromRequest, getAuditEntity } from "@/lib/audit-format";

const resource = "shift-assignments";

async function writeAuditEntry(request, action, row) {
  const payload = {
    actor: getAuditActorFromRequest(request),
    action,
    entity: getAuditEntity(resource),
    entityId: row?.id || "",
    detail: buildAuditDetail(action, resource, row, row?.id)
  };

  const persistentLog = await createPersistentAuditLog(payload);
  if (!persistentLog) createActivityLog(payload);
}

export async function GET() {
  return Response.json(getResource(resource) || []);
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const row = createResource(resource, payload);

  if (!row) {
    return Response.json({ error: "Unable to create shift assignment." }, { status: 500 });
  }

  await writeAuditEntry(request, "CREATE", row);
  return Response.json(row, { status: 201 });
}
