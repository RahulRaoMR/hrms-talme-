import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAuth("/reports");
  return <PlaceholderPage title="Standard Reports" eyebrow="Intelligence" />;
}
