import DashboardPageClient from "@/components/pages/dashboard-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth("/dashboard");
  return <DashboardPageClient />;
}
