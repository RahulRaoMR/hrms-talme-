import NotificationsPageClient from "@/components/pages/notifications-page";
import { getNotifications } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  return <NotificationsPageClient notifications={JSON.parse(JSON.stringify(notifications))} />;
}
