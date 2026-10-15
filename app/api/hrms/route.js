import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { getLocalSuiteData, getResource } from "@/lib/local-api-store";
import { getPersistentHrmsData, listPersistentResource } from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";
import { mergeDocumentRecords } from "@/lib/document-records";

export async function GET(request) {
  const proxiedResponse = await proxyToConfiguredApi(request, "/api/hrms");

  if (proxiedResponse) {
    return proxiedResponse;
  }

  let persistentData;

  try {
    persistentData = await getPersistentHrmsData({ fallbackOnError: false });
  } catch (error) {
    return Response.json({ error: error?.status ? error.message : "Unable to load saved HRMS records." }, { status: error?.status || 503 });
  }

  if (persistentData) {
    const uploads = (await listPersistentResource("uploads")) || getResource("uploads") || [];

    return Response.json({
      ...persistentData,
      documents: mergeDocumentRecords(persistentData.documents, uploads),
      shiftAssignments: getResource("shift-assignments") || []
    });
  }

  const localData = getLocalSuiteData() || getEnterpriseSuiteData();

  return Response.json({
    ...localData,
    documents: mergeDocumentRecords(localData.documents, getResource("uploads") || [])
  });
}
