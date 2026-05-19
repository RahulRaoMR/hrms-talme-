import { createResource, getResource } from "@/lib/local-api-store";
import { createPersistentResource, hasPersistentDatabase, listPersistentResource } from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";
import { onboardEmployee } from "@/lib/employee-onboarding";

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

function getUniqueFieldLabel(error) {
  const target = Array.isArray(error?.meta?.target) ? error.meta.target[0] : "";

  if (target === "employeeId") return "Employee ID";
  if (target === "email") return "Email";
  if (target === "invoiceNo") return "Invoice number";
  if (target === "jobId") return "Job ID";
  if (target === "recruiterId") return "Recruiter ID";

  return "value";
}

function persistentErrorResponse(error) {
  if (error?.code === "P2002") {
    const label = getUniqueFieldLabel(error);
    return Response.json({ error: `${label} already exists. Please use a different ${label.toLowerCase()}.` }, { status: 409 });
  }

  console.error(error);
  return Response.json({ error: error?.message || "Internal server error." }, { status: 500 });
}

async function attachEmployeeOnboarding(resource, row) {
  if (resource !== "employees" || !row) {
    return row;
  }

  const onboarding = await onboardEmployee(row);
  return { ...row, onboarding };
}

export async function GET(request, context) {
  const { resource } = await context.params;
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}${new URL(request.url).search}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const persistentRows = await listPersistentResource(resource);

  if (persistentRows) {
    return Response.json(persistentRows);
  }

  const rows = getResource(resource);

  if (!rows) {
    return Response.json({ error: "Unknown API resource." }, { status: 404 });
  }

  return Response.json(rows);
}

export async function POST(request, context) {
  const { resource } = await context.params;

  let payload;

  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  if (hasPersistentDatabase) {
    payload = await request.json().catch(() => ({}));
    const persistentRow = await createPersistentResource(resource, payload).catch((error) => persistentErrorResponse(error));

    if (persistentRow instanceof Response) {
      return persistentRow;
    }

    if (persistentRow) {
      return Response.json(await attachEmployeeOnboarding(resource, persistentRow), { status: 201 });
    }
  }

  if (!shouldUseLocalMutationFallback()) {
    return missingPersistentStoreResponse();
  }

  payload ||= await request.json().catch(() => ({}));
  const row = createResource(resource, payload);

  if (!row) {
    return Response.json({ error: "Unknown API resource." }, { status: 404 });
  }

  return Response.json(await attachEmployeeOnboarding(resource, row), { status: 201 });
}
