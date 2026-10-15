"use client";

const SESSION_KEY = "talme-suite-session";

export function isSuiteSessionExpired(token, now = Date.now()) {
  try {
    const parts = String(token || "").split(".");
    if (![2, 3].includes(parts.length)) return false;
    const encoded = parts[parts.length === 3 ? 1 : 0].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded));
    const expiresAt = parts.length === 3 ? claims.exp * 1000 : claims.expiresAt;
    // This only discards expired browser state; the API still verifies the token.
    return Number.isFinite(expiresAt) && expiresAt <= now;
  } catch {
    return false;
  }
}

export function saveSuiteSession(session) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      ...session,
      authenticatedAt: new Date().toISOString()
    })
  );
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSuiteSession() {
  if (typeof window === "undefined") return null;

  try {
    const session = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null");
    if (isSuiteSessionExpired(session?.token)) {
      clearSuiteSession();
      return null;
    }
    return session?.user?.email && session?.token ? session : null;
  } catch {
    clearSuiteSession();
    return null;
  }
}

export function clearSuiteSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}
