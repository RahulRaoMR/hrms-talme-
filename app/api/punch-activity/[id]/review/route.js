import { handlePunchRequest } from "@/lib/punch-request-handler";
import { decideRegularization, fail } from "@/backend/lib/punch-regularization";

export function PATCH(request, context) {
  return handlePunchRequest(request, async (db, user) => {
    const { id } = await context.params;
    const payload = await request.json();
    if (!["Accepted", "Declined"].includes(payload.status)) fail(400, "Choose Accepted or Declined.");
    return decideRegularization(db, user, id, payload.status, payload.reason);
  });
}
