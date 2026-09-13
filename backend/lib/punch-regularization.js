import crypto from "node:crypto";
import { canReviewPunches } from "./punch-status.js";

export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

export function punchUser(authorization) {
  const [payload, signature, extra] = String(authorization || "").replace(/^Bearer\s+/i, "").split(".");
  if (!payload || !signature || extra) fail(401, "Please sign in again.");
  const expected = crypto.createHmac("sha256", process.env.AUTH_SECRET || "talme-dev-secret").update(payload).digest("base64url");
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail(401, "Please sign in again.");
  let session;
  try { session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { fail(401, "Please sign in again."); }
  if (!session?.user?.email || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) fail(401, "Session expired. Please sign in again.");
  return session.user;
}

const normalized = (value) => String(value || "").trim().toLowerCase();

export function scopedEmployee(user, requested) {
  if (canReviewPunches(user)) return String(requested || "").trim();
  if (!user.employeeId || (requested && normalized(requested) !== normalized(user.employeeId))) fail(403, "You can only access your own punch requests.");
  return user.employeeId;
}

export async function listRegularizations(db, user, employeeId) {
  const scope = scopedEmployee(user, employeeId);
  return db.punchActivity.findMany({
    where: {
      regularizationStatus: { in: ["Pending", "Accepted", "Declined", "Withdrawn"] },
      ...(scope ? { employeeId: { equals: scope, mode: "insensitive" } } : {})
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function decideRegularization(db, user, id, status, declineReason = "") {
  if (!["Accepted", "Declined", "Withdrawn"].includes(status)) fail(400, "Invalid review status.");
  if (status !== "Withdrawn" && !canReviewPunches(user)) fail(403, "Only HR or administrators can review requests.");
  const reason = String(declineReason || "").trim();
  if (reason.length > 1000) fail(400, "Decline reason must be 1,000 characters or fewer.");
  return db.$transaction(async (tx) => {
    const row = await tx.punchActivity.findUnique({ where: { id } });
    if (!row) fail(404, "Regularization request not found.");
    const employee = await tx.employee.findFirst({ where: { employeeId: { equals: row.employeeId, mode: "insensitive" } } });
    const own = normalized(user.employeeId) === normalized(row.employeeId) || (employee?.email && normalized(user.email) === normalized(employee.email));
    if (status === "Withdrawn" ? !own : own) fail(403, status === "Withdrawn" ? "You can only withdraw your own request." : "You cannot review your own request.");
    const changed = await tx.punchActivity.updateMany({
      where: { id, regularizationStatus: "Pending" },
      data: {
        regularizationStatus: status,
        regularizationReviewedBy: user.email,
        regularizationReviewedAt: new Date(),
        regularizationDeclineReason: status === "Declined" ? reason || null : null
      }
    });
    if (!changed.count) fail(409, "This request is no longer pending. Refresh to see its current status.");
    await tx.auditLog.create({ data: {
      actor: user.email, action: status.toUpperCase(), entity: "Punch Activity", entityId: id,
      detail: `${status} regularization for ${row.employeeId} on ${row.workDate}${reason ? `: ${reason}` : ""}`
    } });
    return tx.punchActivity.findUnique({ where: { id } });
  });
}

export async function submitManualPunch(db, user, data, reason) {
  scopedEmployee(user, data.employeeId);
  if (!String(reason || "").trim() && !canReviewPunches(user)) fail(400, "A reason is required for regularization.");
  return db.$transaction(async (tx) => {
    // Serialize submissions for the same employee/day so retries reuse one record.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalized(data.employeeId) + ":" + data.workDate}))`;
    const existing = await tx.punchActivity.findFirst({
      where: { employeeId: { equals: data.employeeId, mode: "insensitive" }, workDate: data.workDate, type: data.type },
      orderBy: { timestamp: data.type === "Punch In" ? "asc" : "desc" }
    });
    if (existing?.regularizationStatus && existing.regularizationStatus !== "Pending") fail(409, "This punch request has already been processed.");
    if (existing?.regularizationStatus && !reason) fail(409, "Use the regularization review actions for this punch.");
    const next = { ...data, reason: reason || null, regularizationStatus: reason ? "Pending" : null };
    let row;
    if (existing) {
      const changed = await tx.punchActivity.updateMany({ where: { id: existing.id, updatedAt: existing.updatedAt, regularizationStatus: existing.regularizationStatus }, data: next });
      if (!changed.count) fail(409, "This punch changed during submission. Please refresh and try again.");
      row = await tx.punchActivity.findUnique({ where: { id: existing.id } });
    } else {
      row = await tx.punchActivity.create({ data: next });
    }
    return { row, created: !existing };
  });
}
