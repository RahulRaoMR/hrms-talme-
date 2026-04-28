import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function HiringTrackerPage() {
  await requireAuth("/recruitment/hiring-tracker");
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