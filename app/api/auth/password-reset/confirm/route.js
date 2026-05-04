import { json, withController } from "@/controllers/http-controller";
import { confirmPasswordReset } from "@/modules/auth/password-reset-service";

export async function POST(request) {
  return withController(async () => {
    const body = await request.json();
    return json(await confirmPasswordReset(body));
  });
}
