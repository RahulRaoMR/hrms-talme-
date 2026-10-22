import { prisma } from "@/lib/prisma-store";
import { getConfiguredApiBase } from "@/lib/server-api";
import { getResource } from "@/lib/local-api-store";
import { getPayslipRecords } from "@/lib/payslip-store";
import { createEmployeeMobileSession, refreshEmployeeMobileSession, revokeEmployeeMobileSession, employeeMobileUser, employeeMobileData } from "@/backend/lib/employee-mobile-session";

export const dynamic = "force-dynamic";
const normalized = (value) => String(value || "").trim().toLowerCase();
const json = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });

async function backend(request, path, options) {
  const base = getConfiguredApiBase(request);
  if (!base) return null;
  const response = await fetch(`${base}/api/employee-mobile/${path}`, options || {
    method: request.method, headers: { "Content-Type": "application/json", Authorization: request.headers.get("authorization") || "" },
    body: request.method === "GET" ? undefined : await request.clone().text(),
    cache: "no-store", signal: AbortSignal.timeout(15000)
  });
  return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
}

async function verifiedUser(request) {
  const response = await backend(request, "session", { headers: { Authorization: request.headers.get("authorization") || "" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (response) {
    if (!response.ok) throw Object.assign(new Error((await response.json()).error), { status: response.status });
    return response.json();
  }
  return employeeMobileUser(prisma, request.headers.get("authorization"));
}

async function handle(request, context) {
  try {
    const { path: parts = [] } = await context.params;
    const path = parts.join("/");
    const method = request.method;
    if (["sessions", "refresh", "logout"].includes(path) && method === "POST") {
      const remote = await backend(request, path);
      if (remote) return remote;
      if (path === "sessions") return json(await createEmployeeMobileSession(prisma, request.headers.get("authorization")), 201);
      const body = await request.json().catch(() => ({}));
      if (path === "refresh") return json(await refreshEmployeeMobileSession(prisma, body.refreshToken));
      await revokeEmployeeMobileSession(prisma, body.refreshToken);
      return json({ loggedOut: true });
    }

    const { user, employee } = await verifiedUser(request);
    if (path === "session" && method === "GET") return json({ user });
    const identifiers = [user.employeeId, employee.name, employee.email].map(normalized).filter(Boolean);
    const own = (value) => Boolean(normalized(value)) && identifiers.includes(normalized(value));
    if (path === "hrms" && method === "GET") {
      const remote = await backend(request, path);
      if (remote && !remote.ok) return remote;
      const data = remote ? await remote.json() : await employeeMobileData(prisma, employee);
      data.payslips = getPayslipRecords().filter((record) => own(record.employeeId || record.employee || record.name));
      data.shiftAssignments = (getResource("shift-assignments") || []).filter((row) => own(row.employeeId || row.employee || row.employeeName));
      return json(data);
    }
    if (path === "shift-assignments" && method === "GET") return json((getResource("shift-assignments") || []).filter((row) => own(row.employeeId || row.employee || row.employeeName)));

    const target = new URL(`/api/${path}${new URL(request.url).search}`, request.url);
    const options = { method, headers: new Headers(request.headers) };
    options.headers.set("x-talme-actor", user.email);
    options.headers.set("x-talme-actor", user.email);
    let response;
    if (path === "punch-activity" && ["GET", "POST"].includes(method)) {
      if (method === "GET") {
        const requested = target.searchParams.get("employeeId");
        if (requested && normalized(requested) !== normalized(user.employeeId)) return json({ error: "You can only access your own attendance." }, 403);
        target.searchParams.set("employeeId", user.employeeId);
      } else {
        const body = await request.json();
        if (body.employeeId && normalized(body.employeeId) !== normalized(user.employeeId)) return json({ error: "You can only update your own attendance." }, 403);
        options.body = JSON.stringify({ ...body, employeeId: user.employeeId, employeeName: employee.name });
      }
      const route = await import("@/app/api/punch-activity/route");
      response = await route[method](new Request(target, options));
    } else if (/^punch-activity\/[^/]+\/withdraw$/.test(path) && method === "PATCH") {
      const route = await import("@/app/api/punch-activity/[id]/withdraw/route");
      options.body = await request.text();
      response = await route.PATCH(new Request(target, options), { params: Promise.resolve({ id: parts[1] }) });
    } else if (path === "leave-requests" && method === "POST") {
      const body = await request.json();
      options.body = JSON.stringify({ ...body, employee: employee.name, status: "Pending", tone: "gold", approver: employee.manager || "Manager" });
      const route = await import("@/app/api/[resource]/route");
      response = await route.POST(new Request(target, options), { params: Promise.resolve({ resource: "leave-requests" }) });
    } else if (path === "uploads" && method === "POST") {
      const form = await request.formData();
      form.set("owner", employee.name);
      form.set("module", "Employee");
      options.headers.delete("content-type");
      options.headers.delete("content-length");
      options.body = form;
      const route = await import("@/app/api/uploads/route");
      response = await route.POST(new Request(target, options));
    } else if (path === "activity" && method === "POST") {
      const body = await request.json();
      options.body = JSON.stringify({ actor: user.email, action: ["VIEW", "CLICK"].includes(body.action) ? body.action : "VIEW", entity: "Employee App", entityId: user.employeeId, detail: String(body.detail || "").slice(0, 1000) });
      const route = await import("@/app/api/activity/route");
      response = await route.POST(new Request(target, options));
    } else return json({ error: "This employee API operation is not available." }, 404);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return json({ error: error.status ? error.message : ["P2021", "P2022"].includes(error.code) ? "The employee mobile session migration must be deployed." : "Employee service is temporarily unavailable. Please retry." }, error.status || 503);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
