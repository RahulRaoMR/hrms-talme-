import { getEnterpriseSuiteData } from "@/lib/frontend-data";
import { proxyToConfiguredApi } from "@/lib/server-api";

export async function GET(request) {
  const proxiedResponse = await proxyToConfiguredApi(request, "/api/hrms");

  if (proxiedResponse) {
    return proxiedResponse;
  }

  return Response.json(getEnterpriseSuiteData());
}
