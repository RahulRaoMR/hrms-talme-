import PayrollPageClient from "@/components/pages/payroll-page";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  await requireAuth("/payroll");
  return <PayrollPageClient />;
}
