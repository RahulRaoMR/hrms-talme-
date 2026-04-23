import PlaceholderPage from "@/components/pages/placeholder-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  await requireAuth("/approvals");
  return <PlaceholderPage title="Approval Requests" eyebrow="Workflow Engine" />;
}
