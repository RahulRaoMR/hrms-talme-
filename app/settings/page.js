import SettingsPageClient from "@/components/pages/settings-page";
import { requireAuth } from "@/lib/require-auth";
import { getCompanySettings } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAuth("/settings");
  const settings = await getCompanySettings();
  return <SettingsPageClient settings={JSON.parse(JSON.stringify(settings))} />;
}
