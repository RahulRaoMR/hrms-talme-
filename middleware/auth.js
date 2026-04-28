import { auth } from "@/auth";
import { ApiRouteError } from "@/lib/api-route-factory";
import { canAccess } from "@/lib/permissions";

export async function requireApiUser() {
  const session = await auth();

  if (!session?.user) {
    throw new ApiRouteError("Unauthorized.", 401);
  }

  return session.user;
}

export async function requireApiAccess(pathname) {
  const user = await requireApiUser();

  if (pathname && !canAccess(user.role, pathname)) {
    throw new ApiRouteError("Forbidden.", 403);
  }

  return user;
}
