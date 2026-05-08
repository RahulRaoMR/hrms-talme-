import PlaceholderPage from "@/components/pages/placeholder-page";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
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