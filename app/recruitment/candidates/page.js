import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  await requireAuth("/recruitment/candidates");
  return (
    <PlaceholderPage
      eyebrow="Recruitment"
      title="Candidates"
      description="Track applicants and their progress"
      primaryHref="/recruitment"
      primaryLabel="Back to Recruitment"
    />
  );
}