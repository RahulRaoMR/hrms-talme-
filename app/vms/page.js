import VmsPageClient from "@/components/pages/vms-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function VmsPage() {
  await requireAuth("/vms");
  return <VmsPageClient />;
}
