import { json, withController } from "@/controllers/http-controller";
import { createLoginPreview } from "@/modules/auth/service";

export async function POST(request) {
  return withController(async () => {
    const body = await request.json();
    return json(await createLoginPreview(body));
  });
}
