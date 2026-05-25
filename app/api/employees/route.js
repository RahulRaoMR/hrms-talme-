import { createResource, getResource } from "@/lib/local-api-store";
import { createPersistentResource, hasPersistentDatabase, listPersistentResource } from "@/lib/prisma-store";
import { onboardEmployee } from "@/lib/employee-onboarding";

function shouldUseLocalMutationFallback() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_EPHEMERAL_API_STORE === "true";
}

function missingPersistentStoreResponse() {
  return Response.json(
    {
      error:
        "Employee storage is not configured. Set DATABASE_URL to a PostgreSQL database on the frontend deployment."
    },
    { status: 503 }
  );
}

function getUniqueFieldLabel(error) {
  const target = Array.isArray(error?.meta?.target) ? error.meta.target[0] : "";

  if (target === "employeeId") return "Employee ID";
  if (target === "email") return "Email";

  return "value";
}

function employeeErrorResponse(error) {
  if (error?.code === "P2002") {
    const label = getUniqueFieldLabel(error);
    return Response.json({ error: `${label} already exists. Please use a different ${label.toLowerCase()}.` }, { status: 409 });
  }

  console.error(error);
  return Response.json({ error: error?.message || "Unable to save employee." }, { status: 500 });
}

async function attachOnboarding(row) {
  const onboarding = await onboardEmployee(row);
  return { ...row, onboarding };
}

export async function GET() {
  const persistentRows = await listPersistentResource("employees");

  if (persistentRows) {
    return Response.json(persistentRows);
  }

  return Response.json(getResource("employees") || []);
}

export async function POST(request) {
  let payload;

  if (hasPersistentDatabase) {
    payload = await request.json().catch(() => ({}));
    const persistentRow = await createPersistentResource("employees", payload).catch((error) => employeeErrorResponse(error));

    if (persistentRow instanceof Response) {
      return persistentRow;
    }

    if (persistentRow) {
      return Response.json(await attachOnboarding(persistentRow), { status: 201 });
    }
  }

  if (!shouldUseLocalMutationFallback()) {
    return missingPersistentStoreResponse();
  }

  payload ||= await request.json().catch(() => ({}));
  const row = createResource("employees", payload);

  if (!row) {
    return Response.json({ error: "Employee resource is not available." }, { status: 404 });
  }

  return Response.json(await attachOnboarding(row), { status: 201 });
}
