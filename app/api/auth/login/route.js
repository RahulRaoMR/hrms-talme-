import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { createActivityLog } from "@/lib/local-api-store";
import { getLocalLoginAccount, hasLocalPasswordOverride } from "@/lib/password-reset-store";
import { proxyToConfiguredApi } from "@/lib/server-api";
import { canonicalLoginRole, normalizeLoginRole, isEmployeeLoginRole as isEmployeeIdLoginRole, loginRolesMatch } from "@/lib/login-roles";
import {
  canUsePersistentDatabase,
  canUseLocalMutationFallback,
  createPersistentAuditLog,
  isDatabaseUnavailableError,
  markPersistentDatabaseUnavailable,
  prisma
} from "@/lib/prisma-store";

const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "talme123";
const defaultHrPassword = process.env.DEFAULT_HR_PASSWORD || "hr123";
const defaultAccessPassword = process.env.DEFAULT_ACCESS_PASSWORD || defaultAdminPassword;
const reviewEmployeeId = process.env.PLAY_REVIEW_EMPLOYEE_ID || "TALME-REVIEW";
const reviewEmployeePassword = process.env.PLAY_REVIEW_EMPLOYEE_PASSWORD || defaultAccessPassword;

export async function POST(request) {
  const proxiedResponse = await proxyToConfiguredApi(request, "/api/auth/login");
  if (proxiedResponse) return proxiedResponse;

  const body = await request.json().catch(() => ({}));
  const identifier = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const expectedRole = normalizeLoginRole(body.role);

  if (!identifier || !password) {
    return Response.json(
      { error: "Email or employee ID and password are required." },
      { status: 400 }
    );
  }

  if (isEmployeeIdLoginRole(expectedRole) && identifier.includes("@")) {
    return Response.json(
      { error: "Employee login requires Employee ID, not email." },
      { status: 400 }
    );
  }

  const reviewEmployee = getPlayReviewEmployee(identifier, password, expectedRole);

  if (reviewEmployee) {
    await writeLoginAudit(reviewEmployee);
    return Response.json({
      token: createSessionToken(reviewEmployee),
      user: reviewEmployee
    });
  }

  let user;
  if (canUsePersistentDatabase()) {
    try {
      user = await getPersistentLoginUser(identifier, password, expectedRole);
    } catch (error) {
      if (!isDatabaseUnavailableError(error)) throw error;
      markPersistentDatabaseUnavailable(error);
      return Response.json({ error: "Login service is temporarily unavailable. Please retry shortly." }, { status: 503 });
    }
  } else if (canUseLocalMutationFallback()) {
    user = await getLocalLoginUser(identifier, password, expectedRole);
  } else {
    return Response.json({ error: "Login service is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }

  if (!user) {
    return Response.json(
      { error: "Invalid email, role, or password." },
      { status: 401 }
    );
  }

  await writeLoginAudit(user);

  return Response.json({
    token: createSessionToken(user),
    user
  });
}

async function writeLoginAudit(user) {
  const payload = {
    actor: user.email || user.employeeId || user.name || "system",
    action: "LOGIN",
    entity: "Auth",
    entityId: user.id || user.employeeId || "",
    detail: `Logged in as ${user.role || "User"}${user.employeeId ? ` (${user.employeeId})` : ""}`
  };
  const persistentLog = await createPersistentAuditLog(payload);
  if (!persistentLog) createActivityLog(payload);
}

function getPlayReviewEmployee(identifier, password, expectedRole) {
  if (!isEmployeeIdLoginRole(expectedRole)) {
    return null;
  }

  if (identifier.toLowerCase() !== reviewEmployeeId.toLowerCase() || password !== reviewEmployeePassword) {
    return null;
  }

  return {
    id: "play-review-employee",
    name: "Play Review Employee",
    email: "hr@talme.in",
    role: "Employee",
    employeeId: reviewEmployeeId
  };
}

async function getPersistentLoginUser(identifier, password, expectedRole) {
  if (!canUsePersistentDatabase()) return null;

  const employee =
    expectedRole === "Employee" || !identifier.includes("@")
      ? await prisma.employee.findFirst({
          where: {
            employeeId: {
              equals: identifier,
              mode: "insensitive"
            }
          },
          select: { id: true, employeeId: true, email: true, name: true }
        })
      : null;
  const loginEmail = String(employee?.email || identifier).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: loginEmail }
  });

  if (!user || !user.active || !loginRolesMatch(user.role, expectedRole)) {
    return null;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);

  if (!matches) {
    return null;
  }

  return {
    id: user.id,
    name: employee?.name || user.name,
    email: user.email,
    role: canonicalLoginRole(user.role),
    employeeId: employee?.employeeId || null
  };
}

async function getLocalLoginUser(identifier, password, expectedRole) {
  const resetAccount = await getLocalLoginAccount(identifier, password, expectedRole);

  if (resetAccount) {
    return resetAccount;
  }

  if (await hasLocalPasswordOverride(identifier)) {
    return null;
  }

  const users = [
    {
      id: "local-admin",
      name: "Talme Director",
      email: "director@talme.ai",
      role: "Enterprise Admin",
      password: defaultAdminPassword,
      employeeId: null
    },
    {
      id: "local-hr",
      name: "Talme HR",
      email: "hr@talme.ai",
      role: "HR",
      password: defaultHrPassword,
      employeeId: null
    },
    {
      id: "local-saidarshaan",
      name: "Saidarshaan",
      email: "saidarshaan@talme.in",
      role: "Enterprise Admin",
      password: defaultAccessPassword,
      employeeId: null
    },
    {
      id: "local-nandhini",
      name: "Nandhini",
      email: "nandhini@talme.in",
      role: "Payroll + ATS",
      password: defaultAccessPassword,
      employeeId: null
    },
    {
      id: "local-amrutha",
      name: "Amrutha",
      email: "accounts@talme.in",
      role: "Accounts",
      password: defaultAccessPassword,
      employeeId: null
    },
    {
      id: "local-harshitha",
      name: "Harshitha",
      email: "harshitha@talme.in",
      role: "ATS",
      password: defaultAccessPassword,
      employeeId: null
    },
    {
      id: "local-himanshu",
      name: "Himanshu",
      email: "himanshu@talme.in",
      role: "ATS",
      password: defaultAccessPassword,
      employeeId: null
    },
    {
      id: "local-pooja",
      name: "Pooja",
      email: "hr@talme.in",
      role: "ATS",
      password: defaultAccessPassword,
      employeeId: null
    },
    {
      id: "local-sreehari",
      name: "Sreehari",
      email: "sreehari@talme.in",
      role: "ATS",
      password: defaultAccessPassword,
      employeeId: null
    }
  ];
  const user = users.find(
    (entry) =>
      entry.email === identifier &&
      entry.password === password &&
      loginRolesMatch(entry.role, expectedRole)
  );

  if (!user) return null;

  const { password: _password, ...safe } = user;
  return safe;
}

function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      user,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000
    })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}
