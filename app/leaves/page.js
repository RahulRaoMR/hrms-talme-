import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function LeavesPage() {
  await requireAuth("/leaves");
  return <PlaceholderPage title="Leaves & Holidays" eyebrow="Absence Management" />;
}
