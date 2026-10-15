import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { punchUser } from "../backend/lib/punch-regularization.js";

async function load(file, dependencies = {}, globals = {}) {
  const context = createContext({ Buffer, Request, Response, AbortSignal, atob, console, ...globals });
  const module = new SourceTextModule(await readFile(new URL(file, import.meta.url), "utf8"), { context });
  await module.link(async (specifier) => {
    const exports = dependencies[specifier] || await import(specifier);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

const user = { email: "invoice-session@example.test", role: "Accounts" };
function token(claims, secret = process.env.AUTH_SECRET || "talme-dev-secret") {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
const request = (value) => new Request("http://localhost/api/auth/session", { headers: value ? { Authorization: `Bearer ${value}` } : {} });

async function resolver(fetch, base = "https://backend.talme.test") {
  return load("../lib/punch-request-handler.js", {
    "@/lib/prisma-store": { canUsePersistentDatabase: () => true, markPersistentDatabaseUnavailable: () => false, prisma: {} },
    "@/lib/server-api": { proxyToConfiguredApi: async () => null, getConfiguredApiBase: () => base },
    "@/backend/lib/punch-regularization": { punchUser }
  }, { fetch });
}

test("local Accounts sessions are accepted without depending on a different backend signing key", async () => {
  const { resolvePunchUser } = await resolver(() => { throw new Error("Should not contact the backend for a valid local session"); });
  const route = await load("../app/api/auth/session/route.js", { "@/lib/punch-request-handler": { resolvePunchUser } });
  const response = await route.GET(request(token({ user, expiresAt: Date.now() + 60000 })));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).user, user);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("backend-issued tokens use the backend's verified identity, not unverified token claims", async () => {
  const remoteToken = token({ user: { ...user, role: "Super Admin" }, expiresAt: Date.now() + 60000 }, "different-backend-key");
  const { resolvePunchUser } = await resolver(async (url, options) => {
    assert.equal(url, "https://backend.talme.test/api/auth/session");
    assert.equal(options.headers.Authorization, `Bearer ${remoteToken}`);
    return Response.json({ user });
  });
  assert.deepEqual(await resolvePunchUser(request(remoteToken)), user);
});

test("invalid and expired sessions never grant invoice access", async () => {
  const { resolvePunchUser } = await resolver(async () => Response.json({ error: "Session expired" }, { status: 401 }));
  const route = await load("../app/api/auth/session/route.js", { "@/lib/punch-request-handler": { resolvePunchUser } });
  for (const value of ["untrusted-session", token({ user, expiresAt: Date.now() - 1000 }), token({ user, expiresAt: Date.now() + 60000 }) + ".extra", ""]) {
    assert.equal((await route.GET(request(value))).status, 401);
  }
});

test("a backend session outage is retryable rather than being treated as a sign-out", async () => {
  const { resolvePunchUser } = await resolver(async () => { throw new TypeError("Backend unavailable"); });
  const route = await load("../app/api/auth/session/route.js", { "@/lib/punch-request-handler": { resolvePunchUser } });
  assert.equal((await route.GET(request("backend-issued-session"))).status, 503);
});

test("expired browser sessions are removed before loading invoices while valid and opaque tokens remain server-verified", async () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  const session = await load("../lib/auth-session.js", {}, { window: { sessionStorage: storage, localStorage: { removeItem() {} } } });
  const expired = token({ user, expiresAt: Date.now() - 1000 });
  session.saveSuiteSession({ user, token: expired });
  assert.equal(session.getSuiteSession(), null);
  assert.equal(data.has("talme-suite-session"), false);
  const valid = token({ user, expiresAt: Date.now() + 60000 });
  session.saveSuiteSession({ user, token: valid });
  assert.equal(session.getSuiteSession().token, valid);
  assert.equal(session.isSuiteSessionExpired("opaque-backend-session"), false);
  const jwt = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })).toString("base64url")}.signature`;
  assert.equal(session.isSuiteSessionExpired(jwt), true);
});

test("invoice clients show a sign-in-required error for rejected sessions without turning it into an empty list", async () => {
  const client = await load("../lib/invoice-client.js", {
    "./auth-session.js": { getSuiteSession: () => ({ user, token: "invalid-session" }) }
  }, { fetch: async () => Response.json({ error: "Please sign in again." }, { status: 401 }) });
  await assert.rejects(client.invoiceRequest(), (error) => error.status === 401 && /Sign in again/.test(error.message));
});
