"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems } from "@/lib/demo-data";
import { canAccess, resolveRole } from "@/lib/permissions";
import { clearSuiteSession, getSuiteSession } from "@/lib/auth-session";

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
  const [lightMode, setLightMode] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const role = resolveRole(session?.user?.role || "") || "Enterprise Admin";
  const visibleNavItems = navItems.filter((item) => canAccess(role, item.href));

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("talme-theme-mode");
    const nextLightMode = savedTheme ? savedTheme === "light" : true;
    setLightMode(nextLightMode);
    setSession(getSuiteSession());
    setSessionChecked(true);
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked || session) return;

    window.location.replace("/login");
  }, [session, sessionChecked]);

  useEffect(() => {
    if (!preferencesLoaded) return;

    document.body.classList.toggle("light-mode", lightMode);
    window.localStorage.setItem("talme-theme-mode", lightMode ? "light" : "dark");
  }, [lightMode, preferencesLoaded]);

  useEffect(() => {
    if (pathname !== "/dashboard") return undefined;

    window.history.pushState({ talmeDashboard: true }, "", window.location.href);

    function sendBackToHrms() {
      router.replace("/");
    }

    window.addEventListener("popstate", sendBackToHrms);
    return () => window.removeEventListener("popstate", sendBackToHrms);
  }, [pathname, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  function toggleTheme() {
    setLightMode((current) => {
      const nextLightMode = !current;

      document.body.classList.toggle("light-mode", nextLightMode);
      window.localStorage.setItem("talme-theme-mode", nextLightMode ? "light" : "dark");

      return nextLightMode;
    });
  }

  function handleLogout() {
    clearSuiteSession();
    window.location.replace("/login");
  }

  if (!sessionChecked || !session) {
    return null;
  }

  return (
    <div className={`app-shell ${lightMode ? "light-suite" : ""} ${navOpen ? "nav-open" : ""}`}>
      <button
        className="mobile-nav-backdrop"
        onClick={() => setNavOpen(false)}
        type="button"
        aria-label="Close Core menu"
      />
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
          <div className="nav-label-row">
            <div className="nav-label">Core</div>
            <button className="mobile-nav-close" onClick={() => setNavOpen(false)} type="button" aria-label="Close Core menu">
              x
            </button>
          </div>
          {visibleNavItems.map((item, index) => (
            <a
              key={item.href}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
              href={item.href}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong>{item.label}</strong>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </div>
                <small>{item.meta}</small>
              </div>
            </a>
          ))}
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-topbar">
          <div className="workspace-head">
            <button
              className="mobile-core-button"
              onClick={() => setNavOpen(true)}
              type="button"
              aria-label="Open Core menu"
              aria-expanded={navOpen}
            >
              <span aria-hidden="true" />
              <strong>Core</strong>
            </button>
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
              onClick={toggleTheme}
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
              onClick={handleLogout}
              type="button"
            >
              Log Out
            </button>
            {primaryHref && (
              <a className="primary-button" href={primaryHref}>
                {primaryLabel}
              </a>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
