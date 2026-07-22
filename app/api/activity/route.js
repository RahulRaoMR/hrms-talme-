import { createActivityLog, deleteActivityLog, listActivityLogs } from "@/lib/local-api-store";
import { createPersistentAuditLog, deletePersistentAuditLog, listPersistentAuditLogs } from "@/lib/prisma-store";

export async function GET() {
  const persistentRows = await listPersistentAuditLogs();

  if (persistentRows) {
    return Response.json(persistentRows);
  }

  return Response.json(listActivityLogs());
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const row = await createPersistentAuditLog(payload);

  if (row) {
    return Response.json(row, { status: 201 });
  }

  return Response.json(createActivityLog(payload), { status: 201 });
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Activity id is required." }, { status: 400 });
  }

  const row = await deletePersistentAuditLog(id);

  if (row) {
    return Response.json(row);
  }

  if (deleteActivityLog(id)) {
    return Response.json({ id });
  }

  return Response.json({ error: "Activity not found." }, { status: 404 });
}
