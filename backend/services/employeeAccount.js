import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createEmployeeLoginAccount } from "../../lib/employee-account.js";

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
  const account = await createEmployeeLoginAccount(prisma, employee, password);
  return { ...account, password: account.created ? password : null };
}
