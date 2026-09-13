import ShiftsPageClient from "@/components/pages/shifts-page";
import { getShiftRosterData } from "@/lib/shift-roster-data";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  const data = await getShiftRosterData();

  return <ShiftsPageClient data={JSON.parse(JSON.stringify(data))} />;
}
