import { json, withController } from "@/controllers/http-controller";
import { searchSuite } from "@/modules/search/service";

export async function GET(request) {
  return withController(async () => {
    const query = request.nextUrl.searchParams.get("q") || "";
    return json(await searchSuite(query));
  });
}
