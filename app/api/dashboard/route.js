import { getDashboardData } from "@/lib/dashboard-data";
import { normalizeDashboardRole } from "@/lib/dashboard-roles.mjs";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const requestedRole = searchParams.get("role") || "";
  const authenticatedRole = getAuthenticatedRole(request) || requestedRole || "Admin";
  const normalizedRole = normalizeDashboardRole(authenticatedRole);
  const dashboard = await getDashboardData({ range, role: normalizedRole });
  const visibleWidgetIds = dashboard.visibleWidgets.map((widget) => widget.id);

  console.log({
    authenticatedRole,
    normalizedRole,
    widgetCount: visibleWidgetIds.length,
    visibleWidgetIds
  });

  return Response.json({
    ...dashboard,
    dashboardDebug: {
      authenticatedRole,
      normalizedRole,
      widgetCount: visibleWidgetIds.length,
      visibleWidgetIds
    }
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

function getAuthenticatedRole(request) {
  const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");

  if (!payload || !signature) return "";

  const expectedSignature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");

  try {
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return "";
    }

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Date.now() > Number(session.expiresAt || 0)) return "";

    return session?.user?.role || "";
  } catch {
    return "";
  }
}
