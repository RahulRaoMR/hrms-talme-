import NotificationsPageClient from "@/components/pages/notifications-page";
import { requireAuth } from "@/lib/require-auth";
import { getNotifications } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAuth("/notifications");
  const notifications = await getNotifications();
  return <NotificationsPageClient notifications={JSON.parse(JSON.stringify(notifications))} />;
}
