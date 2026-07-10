import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getLocalLoginAccount, hasLocalPasswordOverride } from "@/lib/password-reset-store";
import { hasPersistentDatabase, isDatabaseUnavailableError, prisma } from "@/lib/prisma-store";

const authSecret = process.env.AUTH_SECRET || "talme-dev-secret";
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "talme123";
const defaultHrPassword = process.env.DEFAULT_HR_PASSWORD || "hr123";
const defaultAccessPassword = process.env.DEFAULT_ACCESS_PASSWORD || defaultAdminPassword;
const reviewEmployeeId = process.env.PLAY_REVIEW_EMPLOYEE_ID || "TALME-REVIEW";
const reviewEmployeePassword = process.env.PLAY_REVIEW_EMPLOYEE_PASSWORD || defaultAccessPassword;

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

  if (isEmployeeIdLoginRole(expectedRole) && identifier.includes("@")) {
    return Response.json(
      { error: "Employee login requires Employee ID, not email." },
      { status: 400 }
    );
  }

  const reviewEmployee = getPlayReviewEmployee(identifier, password, expectedRole);

  if (reviewEmployee) {
    return Response.json({
      token: createSessionToken(reviewEmployee),
      user: reviewEmployee
    });
  }

  const persistentUser = await getPersistentLoginUser(identifier, password, expectedRole)
    .catch((error) => {
      if (!isDatabaseUnavailableError(error)) {
        throw error;
      }

      console.error("Login database is unavailable; trying local authentication.", error.code);
      return null;
    });
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

  if (!user || !user.active || (expectedRole && canonicalLoginRole(user.role) !== canonicalLoginRole(expectedRole))) {
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

function normalizeLoginRole(role) {
  const roles = {
    admin: "Enterprise Admin",
    superAdmin: "Enterprise Admin",
    administrator: "Enterprise Admin",
    hr: "HR",
    payrollAts: "Payroll + ATS",
    ats: "ATS",
    invoice: "Accounts",
    accounts: "Accounts",
    employeeHrms: "Employee HRMS",
    payroll: "Payroll",
    employee: "Employee"
  };

  return roles[role] || role || "";
}

function isEmployeeIdLoginRole(role) {
  return ["Employee", "Employee HRMS"].includes(role);
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
      (!expectedRole || canonicalLoginRole(entry.role) === canonicalLoginRole(expectedRole))
  );

  if (!user) return null;

  const { password: _password, ...safe } = user;
  return safe;
}

function canonicalLoginRole(role) {
  const normalized = String(role || "").trim().toLowerCase();

  if (["admin", "administrator", "super admin", "enterprise admin"].includes(normalized)) {
    return "Enterprise Admin";
  }

  if (["account", "accounts", "invoice", "finance"].includes(normalized)) {
    return "Accounts";
  }

  return role || "";
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
