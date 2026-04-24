import ApprovalsPageClient from "@/components/pages/approvals-page";
import { requireAuth } from "@/lib/require-auth";
import { getApprovalItems } from "@/lib/query-data";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  await requireAuth("/approvals");
  const approvals = await getApprovalItems();
  return <ApprovalsPageClient approvals={JSON.parse(JSON.stringify(approvals))} />;
}
