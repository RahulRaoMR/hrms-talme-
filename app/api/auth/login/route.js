import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getLocalLoginAccount, hasLocalPasswordOverride } from "@/lib/password-reset-store";
import { hasPersistentDatabase, prisma } from "@/lib/prisma-store";

const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "talme123";
const defaultHrPassword = process.env.DEFAULT_HR_PASSWORD || "hr123";

export async function POST(request) {
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

  const persistentUser = await getPersistentLoginUser(identifier, password, expectedRole);
  const user = persistentUser || await getLocalLoginUser(identifier, password, expectedRole);

  if (!user) {
    return Response.json(
      { error: "Invalid email, role, or password." },
      { status: 401 }
    );
  }

  return Response.json({
    token: createSessionToken(user),
    user
  });
}

async function getPersistentLoginUser(identifier, password, expectedRole) {
  if (!hasPersistentDatabase) return null;

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

  if (!user || !user.active || (expectedRole && user.role !== expectedRole)) {
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
    role: user.role,
    employeeId: employee?.employeeId || null
  };
}

function normalizeLoginRole(role) {
  const roles = {
    admin: "Enterprise Admin",
    hr: "HR",
    employee: "Employee"
  };

  return roles[role] || role || "";
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
    }
  ];
  const user = users.find(
    (entry) =>
      entry.email === identifier &&
      entry.password === password &&
      (!expectedRole || entry.role === expectedRole)
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
