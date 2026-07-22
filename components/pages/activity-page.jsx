"use client";

import { useEffect, useMemo, useState } from "react";
import FilterChips from "@/components/filter-chips";
import SuiteShell from "@/components/suite-shell";

export default function ActivityPageClient() {
  const [activity, setActivity] = useState([]);
  const [ready, setReady] = useState(false);
  const [entity, setEntity] = useState("All");
  const [query, setQuery] = useState("");
  const entityOptions = useMemo(
    () => ["All", ...Array.from(new Set(activity.map((entry) => entry.entity).filter(Boolean))).sort()],
    [activity]
  );
  const metrics = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return [
      { label: "Total Events", value: activity.length },
      { label: "Today", value: activity.filter((entry) => String(entry.createdAt || "").slice(0, 10) === todayKey).length },
      { label: "Changes", value: activity.filter((entry) => ["CREATE", "UPDATE", "DELETE", "UPLOAD"].includes(entry.action)).length },
      { label: "Clicks", value: activity.filter((entry) => entry.action === "CLICK").length }
    ];
  }, [activity]);

  const filteredActivity = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activity.filter((entry) => {
      const matchesEntity = entity === "All" || entry.entity === entity;
      const matchesQuery =
        !q ||
        String(entry.actor || "").toLowerCase().includes(q) ||
        String(entry.action || "").toLowerCase().includes(q) ||
        String(entry.entity || "").toLowerCase().includes(q) ||
        String(entry.entityId || "").toLowerCase().includes(q) ||
        String(entry.detail || "").toLowerCase().includes(q);
      return matchesEntity && matchesQuery;
    });
  }, [activity, entity, query]);

  async function reload() {
    try {
      const response = await fetch("/api/activity", { cache: "no-store" });
      const payload = await response.json();
      setActivity(Array.isArray(payload) ? payload : []);
    } catch {
      setActivity([]);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    reload();
    const refreshAfterViewLog = window.setTimeout(reload, 800);
    const timer = window.setInterval(reload, 5000);
    window.addEventListener("focus", reload);

    return () => {
      window.clearTimeout(refreshAfterViewLog);
      window.clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, []);

  return (
    <SuiteShell
      eyebrow="Audit Module"
      title="Activity History"
      primaryHref="/dashboard"
      primaryLabel="Back To Dashboard"
      brandEyebrow="Audit Trail"
    >
      <section className="page-section audit-summary-grid">
        {metrics.map((metric) => (
          <article className="audit-summary-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Audit Trail</p>
            <h3>System activity</h3>
            <small>{filteredActivity.length} events shown</small>
          </div>
        </div>
        <div className="table-toolbar">
          <FilterChips
            options={entityOptions}
            value={entity}
            onChange={setEntity}
          />
          <input
            className="search-input"
            placeholder="Search actor, action, or detail"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivity.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.actor}</td>
                <td><span className={`audit-action audit-action-${String(entry.action || "").toLowerCase().replace(/\s+/g, "-")}`}>{entry.action}</span></td>
                <td>{entry.entity}</td>
                <td>{entry.detail}</td>
              </tr>
            ))}
            {!filteredActivity.length ? (
              <tr>
                <td colSpan="5">{ready ? "No activity found for this filter." : "Loading activity..."}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </SuiteShell>
  );
}
