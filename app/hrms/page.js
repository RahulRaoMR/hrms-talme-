import HrmsPageClient from "@/components/pages/hrms-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function HrmsPage() {
  await requireAuth("/hrms");
  return <HrmsPageClient />;
}
