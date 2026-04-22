import UsersPageClient from "@/components/pages/users-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAuth("/users");
  return <UsersPageClient />;
}
