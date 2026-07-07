import {
  exportAtsToSharePoint,
  getAtsSharePointSyncStatus,
  maybeImportAtsFromSharePoint
} from "@/backend/lib/ats-sharepoint-sync";
import { hasPersistentDatabase, prisma } from "@/lib/prisma-store";

function missingPersistentStoreResponse() {
  return Response.json(
    {
      error: "ATS SharePoint sync requires a configured PostgreSQL DATABASE_URL."
    },
    { status: 503 }
  );
}

export async function GET() {
  return Response.json(getAtsSharePointSyncStatus());
}

export async function POST(request) {
  if (!hasPersistentDatabase) {
    return missingPersistentStoreResponse();
  }

  const payload = await request.json().catch(() => ({}));
  const action = String(payload.action || "import").trim().toLowerCase();

  if (action === "export") {
    return Response.json(await exportAtsToSharePoint(prisma));
  }

  return Response.json(await maybeImportAtsFromSharePoint(prisma, { force: true }));
}
