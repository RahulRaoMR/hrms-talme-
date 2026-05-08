import ApprovalsPageClient from "@/components/pages/approvals-page";
import { getApprovalItems } from "@/lib/frontend-data";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await getApprovalItems();
  return <ApprovalsPageClient approvals={JSON.parse(JSON.stringify(approvals))} />;
}
