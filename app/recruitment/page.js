import RecruitmentPageClient from "@/components/pages/recruitment-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function RecruitmentPage() {
  await requireAuth("/recruitment");
  return <RecruitmentPageClient />;
}