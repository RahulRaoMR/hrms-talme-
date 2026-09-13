import { handlePunchRequest } from "@/lib/punch-request-handler";
import { decideRegularization } from "@/backend/lib/punch-regularization";

export function PATCH(request, context) {
  return handlePunchRequest(request, async (db, user) => {
    const { id } = await context.params;
    return decideRegularization(db, user, id, "Withdrawn");
  });
}
