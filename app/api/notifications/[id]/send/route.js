import { updateResource } from "@/lib/local-api-store";

export async function POST(_request, context) {
  const { id } = await context.params;
  const row = updateResource("notifications", id, {
    status: "Sent",
    providerResult: "Marked sent locally",
    providerError: null
  });

  if (!row) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  return Response.json(row);
}
