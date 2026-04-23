import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  await requireAuth("/shifts");
  return <PlaceholderPage title="Manage Shifts" eyebrow="Operations Control" />;
}
