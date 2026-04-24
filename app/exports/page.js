import ExportsPageClient from "@/components/pages/exports-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  await requireAuth("/exports");
  return <ExportsPageClient />;
}
