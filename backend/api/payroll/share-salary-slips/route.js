import { sharePayslips } from "@/modules/payroll/share-salary-slips-service";
import { requireAuth } from "@/middleware/auth";

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const month = body.month || new Date().toISOString().slice(0, 7);
    const sharedBy = body.sharedBy || session.user?.name || "Payroll";

    const results = await sharePayslips(rows, month, sharedBy);

    const sent = results.filter((result) => result.sent).length;
    const skipped = results.filter((result) => result.skipped).length;
    const failed = results.length - sent - skipped;

    return Response.json({
      sent,
      skipped,
      failed,
      results
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to share payslips" },
      { status: 500 }
    );
  }
}
