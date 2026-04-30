"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { navItems } from "@/lib/demo-data";
import { canAccess, resolveRole } from "@/lib/permissions";

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
  const [focusMode, setFocusMode] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const { data: session, status } = useSession();
  const role = resolveRole(session?.user?.role) || "Enterprise Admin";
  const visibleNavItems = navItems.filter((item) => canAccess(role, item.href));

  useEffect(() => {
    const isFocus = window.localStorage.getItem("talme-focus-mode") === "on";
    const isLight = window.localStorage.getItem("talme-theme-mode") === "light";
    setFocusMode(isFocus);
    setLightMode(isLight);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("focus-mode", focusMode);
    window.localStorage.setItem("talme-focus-mode", focusMode ? "on" : "off");
  }, [focusMode]);

  useEffect(() => {
    document.body.classList.toggle("light-mode", lightMode);
    window.localStorage.setItem("talme-theme-mode", lightMode ? "light" : "dark");
  }, [lightMode]);

  if (status === "loading") {
    return (
      <div className="app-loading">
        <div className="loading-card">
          <p className="eyebrow">Talme Suite</p>
          <h2>Preparing Workspace</h2>
        </div>
      </div>
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
            {session?.user ? (
              <p className="session-note">
                Signed in as <strong>{role || session.user.role}</strong> - {session.user.email}
              </p>
            ) : null}
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
              onClick={() => signOut({ callbackUrl: "/login" })}
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
