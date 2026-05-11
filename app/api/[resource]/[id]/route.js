import { deleteResource, getResource, updateResource } from "@/lib/local-api-store";
import { proxyToConfiguredApi } from "@/lib/server-api";

export async function GET(request, context) {
  const { resource, id } = await context.params;
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
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const payload = await request.json().catch(() => ({}));
  const row = updateResource(resource, id, payload);

  if (!row) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  return Response.json(row);
}

export async function DELETE(request, context) {
  const { resource, id } = await context.params;
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/${resource}/${id}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  if (!deleteResource(resource, id)) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  return Response.json({ id });
}
