"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

const vault = registerPlugin("EmployeeSession");
const root = "/api/employee-mobile";
let current = null;
let refreshing = null;
let restoring = null;
let generation = 0;

export function isEmployeeMobileApp() {
  return typeof window !== "undefined" && Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("EmployeeSession");
}

export function getEmployeeMobileSession() { return current; }

async function readCredential() {
  const result = await vault.read();
  try { return JSON.parse(result.credential || "null"); }
  catch { await vault.clear(); return null; }
}

async function request(path, options = {}) {
  const response = await globalThis.fetch(`${root}/${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "Unable to connect to employee services. Please retry."), { status: response.status });
  return body;
}

async function endSession() {
  generation++;
  current = null;
  await vault.clear();
  window.dispatchEvent(new Event("talme-employee-session-ended"));
}

async function revokePending(credential) {
  try {
    await request("logout", { method: "POST", body: JSON.stringify({ refreshToken: credential.refreshToken }) });
    await vault.clear();
  } catch (error) {
    if ([401, 403].includes(error.status)) await vault.clear();
    // A persisted logout tombstone prevents automatic sign-in while offline.
  }
}

export async function beginEmployeeMobileSession(token) {
  const old = await readCredential();
  if (old?.pendingLogout) {
    await revokePending(old);
    if ((await readCredential())?.pendingLogout) throw new Error("Unable to finish your previous logout. Check your connection and retry.");
  }
  const result = await request("sessions", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  try { await vault.write({ credential: JSON.stringify({ refreshToken: result.refreshToken }) }); }
  catch (error) {
    await request("logout", { method: "POST", body: JSON.stringify({ refreshToken: result.refreshToken }) }).catch(() => {});
    throw error;
  }
  generation++;
  current = { token: result.token, user: result.user, expiresAt: result.expiresAt };
  return current;
}

export function refreshEmployeeMobileSession() {
  if (refreshing) return refreshing;
  const started = generation;
  const promise = (async () => {
    const credential = await readCredential();
    if (!credential?.refreshToken || credential.pendingLogout) { current = null; return null; }
    try {
      const result = await request("refresh", { method: "POST", body: JSON.stringify({ refreshToken: credential.refreshToken }) });
      if (started !== generation) return current;
      await vault.write({ credential: JSON.stringify({ refreshToken: result.refreshToken }) });
      if (started !== generation) return current;
      current = { token: result.token, user: result.user, expiresAt: result.expiresAt };
      return current;
    } catch (error) {
      if ([401, 403].includes(error.status) && started === generation) await endSession();
      throw error;
    }
  })();
  refreshing = promise;
  promise.finally(() => { if (refreshing === promise) refreshing = null; }).catch(() => {});
  return promise;
}

export function restoreEmployeeMobileSession() {
  if (!isEmployeeMobileApp()) return Promise.resolve(null);
  if (current && current.expiresAt > Date.now() + 30000) return Promise.resolve(current);
  if (restoring) return restoring;
  const promise = (async () => {
    const credential = await readCredential();
    if (credential?.pendingLogout) { await revokePending(credential); return null; }
    if (!credential?.refreshToken) return null;
    try { return await refreshEmployeeMobileSession(); }
    catch (error) { if ([401, 403].includes(error.status)) return null; throw error; }
  })();
  restoring = promise;
  promise.finally(() => { if (restoring === promise) restoring = null; }).catch(() => {});
  return promise;
}

export async function logoutEmployeeMobileSession() {
  generation++;
  current = null;
  const credential = await readCredential();
  if (credential?.refreshToken) {
    await vault.write({ credential: JSON.stringify({ refreshToken: credential.refreshToken, pendingLogout: true }) });
    await revokePending(credential);
  } else await vault.clear();
  window.dispatchEvent(new Event("talme-employee-session-ended"));
}

export async function employeeMobileFetch(input, options = {}) {
  if (!isEmployeeMobileApp()) return globalThis.fetch(input, options);
  let session = await restoreEmployeeMobileSession();
  if (!session) throw Object.assign(new Error("Please sign in to the Employee App."), { status: 401 });
  const original = new URL(typeof input === "string" ? input : input.url, window.location.origin);
  if (!original.pathname.startsWith("/api/")) throw new Error("Invalid employee API request.");
  const url = `${root}${original.pathname.slice(4)}${original.search}`;
  const send = () => {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${session.token}`);
    return globalThis.fetch(url, { ...options, headers, cache: "no-store" });
  };
  const response = await send();
  if (response.status !== 401) return response;
  // Another concurrent request may already have refreshed this access token.
  session = current?.token !== session.token && current?.expiresAt > Date.now() ? current : await refreshEmployeeMobileSession();
  if (!session) throw Object.assign(new Error("Please sign in to the Employee App."), { status: 401 });
  const retried = await send();
  if (retried.status === 401) {
    await endSession();
    throw Object.assign(new Error("Your employee session is no longer valid. Please sign in again."), { status: 401 });
  }
  return retried;
}
