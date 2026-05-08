import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const suitePaths = [
  "/dashboard",
  "/ats",
  "/vms",
  "/payroll",
  "/approvals",
  "/reports",
  "/documents",
  "/settings",
  "/employee-portal",
  "/employee-app",
  "/vendor-portal",
  "/search",
  "/users",
  "/activity",
  "/hrms",
  "/notifications"
];

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true
};

export function revalidateSuitePaths(paths = []) {
  const uniquePaths = Array.from(new Set([...suitePaths, ...paths]));

  for (const path of uniquePaths) {
    revalidatePath(path);
  }
}

export async function writeAuditLog(action, entity, entityId, detail) {
  const session = await auth();

  await prisma.auditLog.create({
    data: {
      actor: session?.user?.email || "system",
      action,
      entity,
      entityId,
      detail
    }
  });
}
