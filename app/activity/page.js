import ActivityPageClient from "@/components/pages/activity-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  await requireAuth("/activity");
  return <ActivityPageClient />;
}
