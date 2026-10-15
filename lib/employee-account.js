import bcrypt from "bcryptjs";

const accountSelect = { id: true, email: true, name: true, role: true, active: true };
const existingAccountReason = "A login account already exists for this email. Its role, status, and password were left unchanged.";

export async function createEmployeeLoginAccount(db, employee, password) {
  const email = String(employee?.email || employee?.employeeId || "").trim().toLowerCase();
  if (!email) return { created: false, user: null, reason: "Missing employee email or employee ID." };

  const existing = await db.user.findUnique({ where: { email }, select: accountSelect });
  if (existing) return { created: false, user: existing, reason: existingAccountReason };

  try {
    const user = await db.user.create({
      data: { name: employee.name, email, role: "Employee", active: true, passwordHash: await bcrypt.hash(password, 10) },
      select: accountSelect
    });
    return { created: true, user };
  } catch (error) {
    // A simultaneous onboarding request may have created the account first.
    if (error.code === "P2002") {
      const user = await db.user.findUnique({ where: { email }, select: accountSelect });
      if (user) return { created: false, user, reason: existingAccountReason };
    }
    throw error;
  }
}
