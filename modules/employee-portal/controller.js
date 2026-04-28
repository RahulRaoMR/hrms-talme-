import { json, withController } from "@/controllers/http-controller";
import { getEmployeePortalModuleData } from "@/modules/employee-portal/service";

export async function GET() {
  return withController(async () => json(await getEmployeePortalModuleData()));
}
