import {
  canUsePersistentDatabase,
  markPersistentDatabaseUnavailable,
  prisma
} from "@/lib/prisma-store";
import { proxyToConfiguredApi, getConfiguredApiBase } from "@/lib/server-api";
import { punchUser } from "@/backend/lib/punch-regularization";

export async function resolvePunchUser(request) {
  try {
    const user = punchUser(request.headers.get("authorization"));
    if (user.employeeMobileSessionId) {
      const base = getConfiguredApiBase(request);
      if (base) {
        const response = await fetch(`${base}/api/employee-mobile/session`, { headers: { Authorization: request.headers.get("authorization") }, cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw Object.assign(new Error("Unable to validate employee session."), { status: response.status });
        return (await response.json()).user;
      }
      const { employeeMobileUser } = await import("@/backend/lib/employee-mobile-session");
      return (await employeeMobileUser(prisma, request.headers.get("authorization"))).user;
    }
    return user;
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

export async function handlePunchRequest(request, action, localFallback) {
  let user;

  try {
    const url = new URL(request.url);
    const proxiedResponse = await proxyToConfiguredApi(request, url.pathname + url.search);
    if (proxiedResponse) return proxiedResponse;

    user = await resolvePunchUser(request);

    if (!canUsePersistentDatabase()) {
      if (localFallback) {
        return Response.json(await localFallback(user));
      }

      const response = await proxyToConfiguredApi(request, new URL(request.url).pathname + new URL(request.url).search);
      return response || Response.json({ error: "The punch database is unavailable. Please try again." }, { status: 503 });
    }

    return Response.json(await action(prisma, user));
  } catch (error) {
    if (markPersistentDatabaseUnavailable(error) && localFallback) {
      try {
        return Response.json(await localFallback(user || await resolvePunchUser(request)));
      } catch (fallbackError) {
        error = fallbackError;
      }
    }

    if (!error.status) console.error("Punch request failed:", error);
    return Response.json({ error: error.status ? error.message : "Unable to update or load punch requests. Please try again." }, { status: error.status || 503 });
  }
}
