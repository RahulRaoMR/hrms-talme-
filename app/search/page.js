import SearchPageClient from "@/components/pages/search-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  await requireAuth("/search");
  return <SearchPageClient />;
}
