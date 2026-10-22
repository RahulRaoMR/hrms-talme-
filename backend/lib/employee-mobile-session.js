import crypto from "node:crypto";
import { punchUser, fail } from "./punch-regularization.js";
import { isEmployeeLoginRole, canonicalLoginRole } from "../../lib/login-roles.js";

export const employeeAccessLifetimeMs = 30 * 60 * 1000;
export const employeeRefreshLifetimeMs = 365 * 24 * 60 * 60 * 1000;
const rotationRetryMs = 60 * 1000;
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const same = (left, right) => typeof left === "string" && typeof right === "string" && Buffer.byteLength(left) === Buffer.byteLength(right) && crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
const normalized = (value) => String(value || "").trim().toLowerCase();

function secret() {
  if (process.env.NODE_ENV === "production" && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET === "talme-dev-secret")) fail(503, "Employee session signing is not configured.");
  return process.env.AUTH_SECRET || "talme-dev-secret";
}

function credentialHash(account) {
  return crypto.createHmac("sha256", secret()).update(`employee-credentials:${account.passwordHash}`).digest("hex");
}

function refreshToken(id, rotation) {
  const value = `${id}.${rotation}`;
  return `${value}.${crypto.createHmac("sha256", secret()).update(`employee-refresh:${value}`).digest("base64url")}`;
}

function parseRefreshToken(value) {
  const token = String(value || "");
  if (token.length > 250) fail(401, "Employee session is no longer valid.");
  const [id, generation, signature, extra] = token.split(".");
  if (!id || !/^\d{1,9}$/.test(generation || "") || !signature || extra || !same(token, refreshToken(id, Number(generation)))) fail(401, "Employee session is no longer valid.");
  return { id, rotation: Number(generation), token };
}

async function currentEmployee(db, userId, employeeId) {
  const [account, employee] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.employee.findFirst({ where: { employeeId: { equals: employeeId, mode: "insensitive" } } })
  ]);
  if (!account?.active || !isEmployeeLoginRole(account.role) || !employee || !account.email || normalized(account.email) !== normalized(employee.email) || /inactive|not\s*active|disabled|deactivat|block|terminat|reliev|resign|deleted|suspend|separat/i.test(employee.status || "")) fail(401, "Employee access has been disabled or removed.");
  return { account, employee, user: { id: account.id, name: employee.name, email: account.email, employeeId: employee.employeeId, role: canonicalLoginRole(account.role) } };
}

async function activeSession(db, id, now) {
  const session = await db.employeeMobileSession.findUnique({ where: { id } });
  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= now) fail(401, "Employee session is no longer valid.");
  let current;
  try {
    current = await currentEmployee(db, session.userId, session.employeeId);
    if (!same(session.credentialHash, credentialHash(current.account))) fail(401, "Employee credentials have changed. Please sign in again.");
  } catch (error) {
    if (error.status === 401) await db.employeeMobileSession.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(now) } });
    throw error;
  }
  return { session, ...current };
}

function sessionResponse(session, user, now) {
  const expiresAt = now + employeeAccessLifetimeMs;
  // Preserve the existing signed-token format and middleware/role contracts.
  const payload = Buffer.from(JSON.stringify({ user: { ...user, employeeMobileSessionId: session.id }, expiresAt })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, user, expiresAt, refreshToken: refreshToken(session.id, session.rotation), refreshExpiresAt: new Date(session.expiresAt).getTime() };
}

export async function createEmployeeMobileSession(db, authorization, now = Date.now()) {
  const signedIn = punchUser(authorization);
  if (!signedIn.employeeId || !isEmployeeLoginRole(signedIn.role)) fail(403, "Persistent mobile sessions are only available to employees.");
  const { account, employee, user } = await currentEmployee(db, signedIn.id, signedIn.employeeId);
  const id = crypto.randomUUID();
  const session = await db.employeeMobileSession.create({ data: {
    id, userId: account.id, employeeId: employee.employeeId,
    credentialHash: credentialHash(account), refreshTokenHash: hash(refreshToken(id, 0)),
    expiresAt: new Date(now + employeeRefreshLifetimeMs), createdAt: new Date(now), lastActiveAt: new Date(now)
  } });
  return sessionResponse(session, user, now);
}

export async function refreshEmployeeMobileSession(db, value, now = Date.now()) {
  const parsed = parseRefreshToken(value);
  const current = await activeSession(db, parsed.id, now);
  const { session, user } = current;
  const fingerprint = hash(parsed.token);
  if (!same(fingerprint, session.refreshTokenHash)) {
    // A short retry window covers concurrent calls or a lost refresh response.
    if (same(fingerprint, session.previousTokenHash) && now - new Date(session.rotatedAt).getTime() <= rotationRetryMs) return sessionResponse(session, user, now);
    await db.employeeMobileSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date(now) } });
    fail(401, "Employee session was revoked. Please sign in again.");
  }
  const rotation = session.rotation + 1;
  const changed = await db.employeeMobileSession.updateMany({
    where: { id: session.id, refreshTokenHash: fingerprint, revokedAt: null },
    data: { rotation, previousTokenHash: fingerprint, refreshTokenHash: hash(refreshToken(session.id, rotation)), rotatedAt: new Date(now), lastActiveAt: new Date(now), expiresAt: new Date(now + employeeRefreshLifetimeMs) }
  });
  if (!changed.count) {
    const latest = await activeSession(db, session.id, now);
    if (same(fingerprint, latest.session.previousTokenHash)) return sessionResponse(latest.session, latest.user, now);
    fail(401, "Employee session is no longer valid.");
  }
  return sessionResponse({ ...session, rotation, expiresAt: new Date(now + employeeRefreshLifetimeMs) }, user, now);
}

export async function revokeEmployeeMobileSession(db, value, now = Date.now()) {
  const { id } = parseRefreshToken(value);
  // A signed credential from this device's token family may revoke that family,
  // including when a refresh response and logout cross in flight.
  await db.employeeMobileSession.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(now) } });
}

export async function employeeMobileUser(db, authorization, now = Date.now()) {
  const signedIn = punchUser(authorization);
  if (!signedIn.employeeMobileSessionId || !isEmployeeLoginRole(signedIn.role)) fail(401, "A valid employee mobile session is required.");
  const { session, user, employee } = await activeSession(db, signedIn.employeeMobileSessionId, now);
  if (user.id !== signedIn.id || normalized(user.employeeId) !== normalized(signedIn.employeeId) || session.userId !== signedIn.id) fail(401, "Employee session is no longer valid.");
  return { user, employee };
}

export async function employeeMobileData(db, employee) {
  const own = { in: [employee.name, employee.employeeId, employee.email].filter(Boolean), mode: "insensitive" };
  const [leaveRequests, attendanceRecords, documents, uploads, punchActivity] = await Promise.all([
    db.leaveRequest.findMany({ where: { employee: own }, orderBy: { createdAt: "desc" } }),
    db.attendanceRecord.findMany({ where: { employee: own }, orderBy: { createdAt: "desc" } }),
    db.documentRecord.findMany({ where: { owner: own }, orderBy: { createdAt: "desc" } }),
    db.uploadedAsset.findMany({ where: { owner: own }, orderBy: { createdAt: "desc" } }),
    db.punchActivity.findMany({ where: { employeeId: { equals: employee.employeeId, mode: "insensitive" } }, orderBy: { timestamp: "desc" } })
  ]);
  return { employees: [employee], leaveRequests, attendanceRecords, documents: [...documents, ...uploads.map((asset) => ({ ...asset, docType: asset.label }))], punchActivity, settings: [], vendorWorkers: [], approvals: [], assets: uploads, payslips: [], shiftAssignments: [] };
}
