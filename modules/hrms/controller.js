import { json, withController } from "@/controllers/http-controller";
import { getHrmsModuleData } from "@/modules/hrms/service";

export async function GET() {
  return withController(async () => json(await getHrmsModuleData()));
}
