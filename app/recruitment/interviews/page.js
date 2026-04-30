import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  await requireAuth("/recruitment/interviews");
  return (
    <PlaceholderPage
      eyebrow="Recruitment"
      title="Interviews"
      description="Schedule and manage interview sessions"
      primaryHref="/recruitment"
      primaryLabel="Back to Recruitment"
    />
  );
}