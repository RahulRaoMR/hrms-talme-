import DashboardPageClient from "@/components/pages/dashboard-page";
import "./dashboard.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return <DashboardPageClient />;
}
