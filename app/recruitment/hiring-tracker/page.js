import PlaceholderPage from "@/components/pages/placeholder-page";

export const dynamic = "force-dynamic";

export default async function HiringTrackerPage() {
  return (
    <PlaceholderPage
      eyebrow="Recruitment"
      title="Hiring Tracker"
      description="Monitor recruitment pipeline metrics"
      primaryHref="/recruitment"
      primaryLabel="Back to Recruitment"
    />
  );
}