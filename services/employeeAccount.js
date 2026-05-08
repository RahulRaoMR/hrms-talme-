import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function generateEmployeePassword() {
  return `Talme@${randomBytes(4).toString("hex")}`;
}

export function getEmployeeLoginEmail(employee) {
  return String(employee?.email || employee?.employeeId || "").trim().toLowerCase();
}

export async function createEmployeePortalAccount(employee) {
  const loginEmail = getEmployeeLoginEmail(employee);

  if (!loginEmail) {
    return { password: null, user: null };
  }

  const password = generateEmployeePassword();
  const user = await prisma.user.upsert({
    where: { email: loginEmail },
    update: {
      name: employee.name,
      role: "Employee",
      active: true,
      passwordHash: await bcrypt.hash(password, 10)
    },
    create: {
      name: employee.name,
      email: loginEmail,
      role: "Employee",
      active: true,
      passwordHash: await bcrypt.hash(password, 10)
    }
  });

  return { password, user };
}
