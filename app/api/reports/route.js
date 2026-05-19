import { getLiveReportData } from "@/lib/report-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getLiveReportData();

  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
