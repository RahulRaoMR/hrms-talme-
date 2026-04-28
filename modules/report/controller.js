import { json, withController } from "@/controllers/http-controller";
import { getReportModuleData } from "@/modules/report/service";

export async function GET() {
  return withController(async () => json(await getReportModuleData()));
}
