import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccess, defaultPathForRole } from "@/lib/permissions";

export async function requireAuth(pathname) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (pathname && !canAccess(session.user.role, pathname)) {
    redirect(defaultPathForRole(session.user.role));
  }

  return session;
}
