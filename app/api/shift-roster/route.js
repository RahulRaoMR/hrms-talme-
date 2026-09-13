import { getShiftRosterData } from "@/lib/shift-roster-data";

export async function GET() {
  return Response.json(await getShiftRosterData());
}
