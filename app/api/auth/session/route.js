import { resolvePunchUser as resolveSessionUser } from "@/lib/punch-request-handler";

export async function GET(request) {
  try {
    const user = await resolveSessionUser(request);
    return Response.json({ user }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json(
      { error: error.status === 401 ? "Session expired or invalid. Please sign in again." : "Unable to verify your session. Please retry shortly." },
      { status: error.status || 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
