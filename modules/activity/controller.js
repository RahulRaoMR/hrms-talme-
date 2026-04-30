import { json, withController } from "@/controllers/http-controller";
import { getActivityFeed } from "@/modules/activity/service";

export async function GET() {
  return withController(async () => json(await getActivityFeed()));
}
