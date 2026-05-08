import PlaceholderPage from "@/components/pages/placeholder-page";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
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