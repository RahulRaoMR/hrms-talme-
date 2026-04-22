import NotificationsPageClient from "@/components/pages/notifications-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAuth("/notifications");
  return <NotificationsPageClient />;
}
