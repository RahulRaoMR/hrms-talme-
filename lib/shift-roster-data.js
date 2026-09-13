import { getFrontendEmployees } from "@/lib/frontend-data";
import { getResource } from "@/lib/local-api-store";
import { listPersistentResource } from "@/lib/prisma-store";

export async function getShiftRosterData() {
  const persistentEmployees = await listPersistentResource("employees");
  const employees = persistentEmployees || getResource("employees") || getFrontendEmployees();

  return {
    employees,
    shiftAssignments: getResource("shift-assignments") || []
  };
}
