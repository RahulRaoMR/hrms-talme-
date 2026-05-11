import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { getPersistentHrmsData } from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";

export async function GET(request) {
  const persistentData = await getPersistentHrmsData();

  if (persistentData) {
    return Response.json(persistentData);
  }

  const proxiedResponse = await proxyToConfiguredApi(request, "/api/hrms");

  if (proxiedResponse) {
    return proxiedResponse;
  }

  return Response.json(getEnterpriseSuiteData());
}
