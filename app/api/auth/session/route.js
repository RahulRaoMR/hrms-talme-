import crypto from "node:crypto";

const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";

export function GET(request) {
  const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = verifySessionToken(token);

  if (!user) {
    return Response.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }

  return Response.json({ user });
}

function verifySessionToken(token) {
  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature) return null;

  const expectedSignature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    if (!session?.user?.email || Date.now() > Number(session.expiresAt || 0)) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}
