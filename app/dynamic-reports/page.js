import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function DynamicReportsPage() {
  await requireAuth("/dynamic-reports");
  return <PlaceholderPage title="Dynamic Reports" eyebrow="Advanced Analytics" />;
}
