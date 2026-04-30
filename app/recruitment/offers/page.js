import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  await requireAuth("/recruitment/offers");
  return (
    <PlaceholderPage
      eyebrow="Recruitment"
      title="Offers"
      description="Create and send job offers"
      primaryHref="/recruitment"
      primaryLabel="Back to Recruitment"
    />
  );
}