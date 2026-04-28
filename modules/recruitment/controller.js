import { json, withController } from "@/controllers/http-controller";
import { getRecruitmentModuleData } from "@/modules/recruitment/service";

export async function GET() {
  return withController(async () => json(await getRecruitmentModuleData()));
}
