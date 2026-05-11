import { createResource, getResource } from "@/lib/local-api-store";
import { proxyToConfiguredApi } from "@/lib/server-api";

export async function GET(request, context) {
  const { resource } = await context.params;
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}${new URL(request.url).search}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const rows = getResource(resource);

  if (!rows) {
    return Response.json({ error: "Unknown API resource." }, { status: 404 });
  }

  return Response.json(rows);
}

export async function POST(request, context) {
  const { resource } = await context.params;
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const payload = await request.json().catch(() => ({}));
  const row = createResource(resource, payload);

  if (!row) {
    return Response.json({ error: "Unknown API resource." }, { status: 404 });
  }

  return Response.json(row, { status: 201 });
}
