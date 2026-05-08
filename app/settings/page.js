import SettingsPageClient from "@/components/pages/settings-page";
import { getCompanySettings } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getCompanySettings();
  return <SettingsPageClient settings={JSON.parse(JSON.stringify(settings))} />;
}
