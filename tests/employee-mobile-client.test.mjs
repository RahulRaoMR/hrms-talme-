import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import test from "node:test";

const user = { id: "employee-account", employeeId: "TTPL-1", name: "Test Employee", email: "employee@example.test", role: "Employee" };

function fixture() {
  const state = { credential: "", requests: [], events: [], now: Date.now(), offline: false, revoked: false, native: true, generation: 0, unauthorized: false };
  const store = {
    read: async () => ({ credential: state.credential }),
    write: async ({ credential }) => { state.credential = credential; },
    clear: async () => { state.credential = ""; }
  };
  const payload = () => ({ token: `access-${++state.generation}`, refreshToken: `refresh-${state.generation}`, user, expiresAt: state.now + 1800000 });
  const fetch = async (url, options = {}) => {
    state.requests.push({ url, ...options });
    if (state.offline) throw new TypeError("Network unavailable");
    if (url.endsWith("/logout")) return Response.json({ loggedOut: true });
    if (url.endsWith("/sessions") || url.endsWith("/refresh")) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return state.revoked ? Response.json({ error: "Revoked" }, { status: 401 }) : Response.json(payload());
    }
    if (state.unauthorized && new Headers(options.headers).get("authorization") === "Bearer access-1") return Response.json({ error: "Expired" }, { status: 401 });
    return Response.json({ ok: true });
  };
  async function load() {
    const window = { location: { origin: "https://hrms.talme.in" }, dispatchEvent: (event) => state.events.push(event.type) };
    const context = createContext({ window, console, URL, Headers, Event, Response, setTimeout, fetch, Date: class extends Date { static now() { return state.now; } } });
    const module = new SourceTextModule(await readFile(new URL("../lib/employee-mobile-session.js", import.meta.url), "utf8"), { context });
    await module.link(() => new SyntheticModule(["Capacitor", "registerPlugin"], function () {
      this.setExport("Capacitor", { getPlatform: () => state.native ? "android" : "web", isPluginAvailable: () => state.native });
      this.setExport("registerPlugin", () => store);
    }, { context }));
    await module.evaluate(); return module.namespace;
  }
  return { state, load };
}

test("fresh process restores the employee using only the native persisted refresh credential", async () => {
  const f = fixture(); const first = await f.load();
  await first.beginEmployeeMobileSession("existing-employee-login-token");
  const saved = JSON.parse(f.state.credential);
  assert.deepEqual(Object.keys(saved), ["refreshToken"]);
  const reopened = await f.load();
  assert.equal(reopened.getEmployeeMobileSession(), null);
  assert.equal((await reopened.restoreEmployeeMobileSession()).user.employeeId, user.employeeId);
  assert.equal(f.state.requests.filter((request) => request.url.endsWith("/refresh")).length, 1);
  assert.equal(f.state.requests.filter((request) => request.url.includes("/auth/login")).length, 0);
});

test("expired access with simultaneous requests performs one refresh and retries safely", async () => {
  const f = fixture(); const client = await f.load(); await client.beginEmployeeMobileSession("signed-in");
  f.state.now += 3600000;
  const results = await Promise.all(Array.from({ length: 10 }, () => client.employeeMobileFetch("/api/punch-activity")));
  assert.ok(results.every((response) => response.ok));
  assert.equal(f.state.requests.filter((request) => request.url.endsWith("/refresh")).length, 1);
  assert.ok(f.state.requests.filter((request) => request.url.endsWith("/punch-activity")).every((request) => new Headers(request.headers).get("authorization") === "Bearer access-2"));
  assert.deepEqual(f.state.events, []);
});

test("concurrent API 401 responses refresh once without a redirect or retry loop", async () => {
  const f = fixture(); const client = await f.load(); await client.beginEmployeeMobileSession("signed-in");
  f.state.unauthorized = true;
  const results = await Promise.all(Array.from({ length: 8 }, () => client.employeeMobileFetch("/api/hrms")));
  assert.ok(results.every((response) => response.ok));
  assert.equal(f.state.requests.filter((request) => request.url.endsWith("/refresh")).length, 1);
  assert.deepEqual(f.state.events, []);
});

test("revoked refresh credentials are cleared while network failures retain the session", async () => {
  const f = fixture(); let client = await f.load(); await client.beginEmployeeMobileSession("signed-in");
  const saved = f.state.credential;
  f.state.offline = true; client = await f.load();
  await assert.rejects(client.restoreEmployeeMobileSession(), /Network unavailable/);
  assert.equal(f.state.credential, saved); assert.deepEqual(f.state.events, []);
  f.state.offline = false; f.state.revoked = true;
  assert.equal(await client.restoreEmployeeMobileSession(), null);
  assert.equal(f.state.credential, ""); assert.deepEqual(f.state.events, ["talme-employee-session-ended"]);
});

test("offline logout prevents restoration across app restarts and revokes when connectivity returns", async () => {
  const f = fixture(); let client = await f.load(); await client.beginEmployeeMobileSession("signed-in");
  f.state.offline = true; await client.logoutEmployeeMobileSession();
  assert.equal(client.getEmployeeMobileSession(), null);
  assert.equal(JSON.parse(f.state.credential).pendingLogout, true);
  client = await f.load(); assert.equal(await client.restoreEmployeeMobileSession(), null);
  assert.equal(f.state.requests.filter((request) => request.url.endsWith("/refresh")).length, 0);
  f.state.offline = false; client = await f.load(); assert.equal(await client.restoreEmployeeMobileSession(), null);
  assert.equal(f.state.credential, "");
});

test("logout racing a refresh cannot restore an authenticated session", async () => {
  const f = fixture(); const client = await f.load(); await client.beginEmployeeMobileSession("signed-in");
  const refresh = client.refreshEmployeeMobileSession();
  await client.logoutEmployeeMobileSession(); await refresh;
  assert.equal(client.getEmployeeMobileSession(), null);
  assert.equal(await (await f.load()).restoreEmployeeMobileSession(), null);
});

test("ordinary web/Admin/HR fetches retain the existing flow and never use native storage", async () => {
  const f = fixture(); f.state.native = false; const client = await f.load();
  assert.equal(client.isEmployeeMobileApp(), false);
  assert.equal(await client.restoreEmployeeMobileSession(), null);
  assert.equal((await client.employeeMobileFetch("/api/hrms", { headers: { Authorization: "Bearer existing-web-session" } })).status, 200);
  assert.equal(f.state.requests[0].url, "/api/hrms");
  assert.equal(f.state.requests[0].headers.Authorization, "Bearer existing-web-session");
  assert.equal(f.state.credential, "");
});
