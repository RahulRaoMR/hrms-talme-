"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems } from "@/lib/demo-data";
import { apiUrl } from "@/lib/api-client";
import { canAccess, resolveRole } from "@/lib/permissions";
import { clearSuiteSession, getSuiteSession, saveSuiteSession } from "@/lib/auth-session";

export default function SuiteShell({
  eyebrow,
  title,
  primaryHref,
  primaryLabel,
  children,
  actions,
  brandEyebrow = "Enterprise Suite"
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [focusMode, setFocusMode] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const role = resolveRole(session?.user?.role || "Enterprise Admin") || "Enterprise Admin";
  const visibleNavItems = navItems.filter((item) => canAccess(role, item.href));

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const currentSession = getSuiteSession();

      if (!currentSession) {
        router.replace("/");
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/auth/session"), {
          headers: {
            Authorization: `Bearer ${currentSession.token}`
          },
          cache: "no-store"
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Session expired. Please sign in again.");
        }

        const verifiedSession = {
          ...currentSession,
          user: payload.user
        };

        saveSuiteSession(verifiedSession);

        if (!cancelled) {
          setSession(verifiedSession);
          setCheckingSession(false);
        }
      } catch {
        clearSuiteSession();
        router.replace("/");
      }
    }

    verifySession();

    const isFocus = window.localStorage.getItem("talme-focus-mode") === "on";
    const isLight = window.localStorage.getItem("talme-theme-mode") === "light";
    setFocusMode(isFocus);
    setLightMode(isLight);

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    document.body.classList.toggle("focus-mode", focusMode);
    window.localStorage.setItem("talme-focus-mode", focusMode ? "on" : "off");
  }, [focusMode]);

  useEffect(() => {
    document.body.classList.toggle("light-mode", lightMode);
    window.localStorage.setItem("talme-theme-mode", lightMode ? "light" : "dark");
  }, [lightMode]);

  useEffect(() => {
    if (pathname !== "/dashboard") return undefined;

    window.history.pushState({ talmeDashboard: true }, "", window.location.href);

    function sendBackToHrms() {
      router.replace("/");
    }

    window.addEventListener("popstate", sendBackToHrms);
    return () => window.removeEventListener("popstate", sendBackToHrms);
  }, [pathname, router]);

  if (checkingSession) {
    return (
      <main className="landing-body">
        <section className="landing-shell">
          <article className="landing-card">
            <div className="landing-badge">Secure Enterprise Access</div>
            <h1>Checking Access</h1>
            <p>Verifying your signed-in session before opening the suite.</p>
          </article>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark" style={{ background: 'transparent' }}>
            <img src="/talme-logo.png" alt="Talme Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
          </div>
          <div>
            <p className="eyebrow">{brandEyebrow}</p>
            <h2>Talme</h2>
          </div>
        </div>

        <div className="nav-group">
          <div className="nav-label">Core</div>
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
              href={item.href}
            >
              <span>{item.index}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong>{item.label}</strong>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </div>
                <small>{item.meta}</small>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-topbar">
          <div className="workspace-head">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="session-note">
              Frontend API: <strong>{process.env.NEXT_PUBLIC_API_URL || "local"}</strong>
            </p>
          </div>
          <div className="topbar-actions">
            <div className="search-pill">Global Search</div>
            <button
              className="ghost-button"
              onClick={() => setFocusMode((current) => !current)}
              type="button"
            >
              {focusMode ? "Standard Focus" : "Focus Mode"}
            </button>
            <button
              className="ghost-button"
              onClick={() => setLightMode((current) => !current)}
              type="button"
            >
              {lightMode ? "Dark Theme" : "Light Theme"}
            </button>
            {actions}
            <button
              className="ghost-button"
              style={{ gap: '10px', padding: '6px 14px 6px 8px' }}
              type="button"
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--panel-soft)', display: 'grid', placeItems: 'center', border: '1px solid var(--line)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <span style={{ fontSize: '0.9rem' }}>Talme Technologies Pvt Ltd</span>
            </button>
            <button
              className="ghost-button"
              onClick={() => {
                clearSuiteSession();
                router.push("/");
              }}
              type="button"
            >
              Log Out
            </button>
            {primaryHref && (
              <Link className="primary-button" href={primaryHref}>
                {primaryLabel}
              </Link>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
