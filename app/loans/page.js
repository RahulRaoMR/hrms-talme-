import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  await requireAuth("/loans");
  return <PlaceholderPage title="Loan & Arrears" eyebrow="Financial Services" />;
}
