import PlaceholderPage from "@/components/pages/placeholder-page";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
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