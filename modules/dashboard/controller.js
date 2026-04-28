import { json, withController } from "@/controllers/http-controller";
import { getDashboardModuleData } from "@/modules/dashboard/service";

export async function GET() {
  return withController(async () => json(await getDashboardModuleData()));
}
