import { hasPersistentDatabase, prisma } from "@/lib/prisma-store";
import { proxyToConfiguredApi, getConfiguredApiBase } from "@/lib/server-api";
import { punchUser } from "@/backend/lib/punch-regularization";

export async function resolvePunchUser(request) {
  try {
    return punchUser(request.headers.get("authorization"));
  } catch (error) {
    const base = getConfiguredApiBase(request);
    if (!base || !request.headers.get("authorization")) throw error;
    const response = await fetch(`${base}/api/auth/session`, {
      headers: { Authorization: request.headers.get("authorization") },
      cache: "no-store", signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw error;
    const result = await response.json();
    if (!result.user?.email) throw error;
    return result.user;
  }
}

export async function handlePunchRequest(request, action) {
  try {
    if (!hasPersistentDatabase) {
      const response = await proxyToConfiguredApi(request, new URL(request.url).pathname + new URL(request.url).search);
      return response || Response.json({ error: "The punch database is unavailable. Please try again." }, { status: 503 });
    }
    const user = await resolvePunchUser(request);
    return Response.json(await action(prisma, user));
  } catch (error) {
    if (!error.status) console.error("Punch request failed:", error);
    return Response.json({ error: error.status ? error.message : "Unable to update or load punch requests. Please try again." }, { status: error.status || 503 });
  }
}
