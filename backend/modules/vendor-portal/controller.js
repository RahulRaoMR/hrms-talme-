import { json, withController } from "@/controllers/http-controller";
import { getVendorPortalModuleData } from "@/modules/vendor-portal/service";

export async function GET() {
  return withController(async () => json(await getVendorPortalModuleData()));
}
