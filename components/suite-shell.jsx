"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { navItems } from "@/lib/demo-data";
import { canAccess } from "@/lib/permissions";

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
          <div className="brand-mark">T</div>
          <div>
            <p className="eyebrow">{brandEyebrow}</p>
            <h2>Talme</h2>
          </div>
        </div>

        <div className="nav-group">
          <div className="nav-label">Core</div>
          {navItems.filter((item) => canAccess(session?.user?.role, item.href)).map((item) => (
            <Link
              key={item.href}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
              href={item.href}
            >
              <span>{item.index}</span>
              <div>
                <strong>{item.label}</strong>
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
                Signed in as <strong>{session.user.role}</strong> - {session.user.email}
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
              onClick={() => signOut({ callbackUrl: "/login" })}
              type="button"
            >
              Log Out
            </button>
            <Link className="primary-button" href={primaryHref}>
              {primaryLabel}
            </Link>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
