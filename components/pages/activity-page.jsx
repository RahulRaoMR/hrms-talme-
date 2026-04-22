"use client";

import { useMemo, useState } from "react";
import FilterChips from "@/components/filter-chips";
import SuiteShell from "@/components/suite-shell";
import { useDemoStore } from "@/lib/use-demo-store";

const seedActivity = [
  {
    id: "seed-activity",
    actor: "system",
    action: "READY",
    entity: "Suite",
    detail: "Audit history is ready",
    createdAt: new Date().toISOString()
  }
];

export default function ActivityPageClient() {
  const { items: activity } = useDemoStore("talme-activity", seedActivity, "/api/activity");
  const [entity, setEntity] = useState("All");
  const [query, setQuery] = useState("");

  const filteredActivity = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activity.filter((entry) => {
      const matchesEntity = entity === "All" || entry.entity === entity;
      const matchesQuery =
        !q ||
        entry.actor.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.detail.toLowerCase().includes(q);
      return matchesEntity && matchesQuery;
    });
  }, [activity, entity, query]);

  return (
    <SuiteShell
      eyebrow="Audit Module"
      title="Activity History"
      primaryHref="/dashboard"
      primaryLabel="Back To Dashboard"
      brandEyebrow="Audit Trail"
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Audit Trail</p>
            <h3>System activity</h3>
          </div>
        </div>
        <div className="table-toolbar">
          <FilterChips
            options={["All", "Candidate", "Vendor", "Invoice", "User", "Database", "Suite"]}
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
                <td>{entry.action}</td>
                <td>{entry.entity}</td>
                <td>{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </SuiteShell>
  );
}
