import CandidateDetailPageClient from "@/components/pages/candidate-detail-page";
import { findFrontendRecord } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { getPersistentResource } from "@/lib/prisma-store";
import { fetchServerApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

function findLocalCandidate(id) {
  const rows = getResource("candidates") || [];
  return rows.find((item) => String(item.id) === String(id)) || null;
}

async function findCandidate(id) {
  try {
    const persistentCandidate = await getPersistentResource("candidates", id);
    if (persistentCandidate) return persistentCandidate;
  } catch {}

  try {
    const apiCandidate = await fetchServerApiJson(`/api/candidates/${id}`);
    if (apiCandidate) return apiCandidate;
  } catch {}

  return findLocalCandidate(id) || findFrontendRecord("candidate", id);
}

export default async function CandidateDetailPage({ params }) {
  const { id } = await params;
  const candidate = await findCandidate(id);

  return <CandidateDetailPageClient id={id} initialCandidate={candidate} />;
}
