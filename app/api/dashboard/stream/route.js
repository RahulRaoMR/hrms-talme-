import { getDashboardData } from "@/lib/dashboard-data";
import { normalizeDashboardRole } from "@/lib/dashboard-roles.mjs";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const authenticatedRole = searchParams.get("role") || "Admin";
  const normalizedRole = normalizeDashboardRole(authenticatedRole);
  const encoder = new TextEncoder();
  let stop;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let timer;

      stop = (closeController = true) => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        request.signal.removeEventListener("abort", onAbort);
        if (closeController) controller.close();
      };

      function onAbort() {
        stop();
      }

      request.signal.addEventListener("abort", onAbort, { once: true });
      if (request.signal.aborted) {
        stop();
        return;
      }

      async function send() {
        if (closed) return;

        try {
          const payload = await getDashboardData({ range, role: normalizedRole });
          if (closed) return;
          const visibleWidgetIds = payload.visibleWidgets.map((widget) => widget.id);
          const dashboardDebug = {
            authenticatedRole,
            normalizedRole,
            widgetCount: visibleWidgetIds.length,
            visibleWidgetIds
          };

          controller.enqueue(encoder.encode(`event: dashboard\ndata: ${JSON.stringify({ ...payload, dashboardDebug })}\n\n`));
        } catch (error) {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error?.message || "Dashboard stream failed." })}\n\n`));
        }

        if (!closed) timer = setTimeout(send, 30000);
      }

      void send();
    },
    cancel() {
      stop(false);
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
