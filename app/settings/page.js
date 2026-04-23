import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAuth("/settings");
  return <PlaceholderPage title="Setting" eyebrow="System Configuration" />;
}
