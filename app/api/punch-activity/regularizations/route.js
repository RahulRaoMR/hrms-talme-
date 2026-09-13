import { handlePunchRequest } from "@/lib/punch-request-handler";
import { listRegularizations } from "@/backend/lib/punch-regularization";

export function GET(request) {
  return handlePunchRequest(request, (db, user) => listRegularizations(db, user, new URL(request.url).searchParams.get("employeeId")));
}
