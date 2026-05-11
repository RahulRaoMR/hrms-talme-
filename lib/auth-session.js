"use client";

const SESSION_KEY = "talme-suite-session";

export function saveSuiteSession(session) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      ...session,
      authenticatedAt: new Date().toISOString()
    })
  );
}

export function getSuiteSession() {
  if (typeof window === "undefined") return null;

  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null");
    return session?.user?.email && session?.token ? session : null;
  } catch {
    clearSuiteSession();
    return null;
  }
}

export function clearSuiteSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
