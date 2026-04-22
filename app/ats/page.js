import AtsPageClient from "@/components/pages/ats-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function AtsPage() {
  await requireAuth("/ats");
  return <AtsPageClient />;
}
