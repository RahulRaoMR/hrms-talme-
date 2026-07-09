import { getDashboardData } from "@/lib/dashboard-data";
import { normalizeDashboardRole } from "@/lib/dashboard-roles.mjs";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const authenticatedRole = searchParams.get("role") || "Admin";
  const normalizedRole = normalizeDashboardRole(authenticatedRole);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      async function send() {
        if (closed) return;

        try {
          const payload = await getDashboardData({ range, role: normalizedRole });
          const visibleWidgetIds = payload.visibleWidgets.map((widget) => widget.id);
          const dashboardDebug = {
            authenticatedRole,
            normalizedRole,
            widgetCount: visibleWidgetIds.length,
            visibleWidgetIds
          };

          console.log(dashboardDebug);
          controller.enqueue(encoder.encode(`event: dashboard\ndata: ${JSON.stringify({ ...payload, dashboardDebug })}\n\n`));
        } catch (error) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error?.message || "Dashboard stream failed." })}\n\n`));
        }
      }

      await send();
      const interval = setInterval(send, 30000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}
