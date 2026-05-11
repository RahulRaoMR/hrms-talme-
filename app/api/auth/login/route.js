import crypto from "node:crypto";

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

  const user = getLocalLoginUser(identifier, password, expectedRole);

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

function normalizeLoginRole(role) {
  const roles = {
    admin: "Enterprise Admin",
    hr: "HR",
    employee: "Employee"
  };

  return roles[role] || role || "";
}

function getLocalLoginUser(identifier, password, expectedRole) {
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
