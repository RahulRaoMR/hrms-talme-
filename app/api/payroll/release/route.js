import { json, withController } from "@/controllers/http-controller";
import { releasePayrollEmails } from "@/services/emailAutomation";

export async function POST(request) {
  return withController(async () => {
    const payload = await request.json().catch(() => ({}));
    const result = await releasePayrollEmails({
      periodLabel: payload?.periodLabel,
      onlyVerified: payload?.onlyVerified
    });

    return json(result);
  });
}
