import ApprovalsPageClient from "@/components/pages/approvals-page";
import { getApprovalItems } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals =
    (await listPersistentResource("approvals")) ||
    (await fetchServerApiJson("/api/approvals")) ||
    getResource("approvals") ||
    getApprovalItems();

  return <ApprovalsPageClient approvals={JSON.parse(JSON.stringify(approvals))} />;
}
