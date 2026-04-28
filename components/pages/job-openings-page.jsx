"use client";

import { useMemo } from "react";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

export default function JobOpeningsPageClient({ data }) {
  const { jobOpenings = [], recruiters = [] } = data;

  const summary = useMemo(() => {
    const openRoles = jobOpenings.filter((item) => item.status === "Open").length;
    const totalOpenings = jobOpenings.reduce(
      (count, item) => count + Number(item.numberOfOpenings || 0),
      0
    );
    const topClients = Object.entries(
      jobOpenings.reduce((acc, item) => {
        const key = item.client || "Unassigned";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { openRoles, totalOpenings, topClients };
  }, [jobOpenings]);

  return (
    <SuiteShell
      eyebrow="Recruitment"
      title="Job Openings"
      primaryHref="/recruitment"
      primaryLabel="Back to Recruitment"
      brandEyebrow="ATS Suite"
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Open Demand</p>
              <h3>Live requirement summary</h3>
            </div>
          </div>
          <div className="score-grid">
            <div className="score-card">
              <strong>{summary.openRoles}</strong>
              <small>Open roles</small>
            </div>
            <div className="score-card">
              <strong>{summary.totalOpenings}</strong>
              <small>Total openings</small>
            </div>
            <div className="score-card">
              <strong>{recruiters.length}</strong>
              <small>Recruiters mapped</small>
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Top Clients</p>
              <h3>Requirement distribution</h3>
            </div>
          </div>
          <div className="doc-stack">
            {summary.topClients.map(([client, count]) => (
              <div className="doc-line" key={client}>
                <span>{client}</span>
                <strong>{count} roles</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Requirement Register</p>
            <h3>Workbook-backed openings</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Position</th>
              <th>Client</th>
              <th>Domain</th>
              <th>Openings</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {jobOpenings.map((opening) => (
              <tr key={opening.id}>
                <td>{opening.jobId}</td>
                <td>{opening.position}</td>
                <td>{opening.client || "-"}</td>
                <td>{opening.domain || "-"}</td>
                <td>{opening.numberOfOpenings || "-"}</td>
                <td>{opening.priority || "-"}</td>
                <td>
                  <StatusBadge tone={opening.tone}>{opening.status || "Unknown"}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Recruiter Allocation</p>
            <h3>Team roster from workbook</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Designation</th>
            </tr>
          </thead>
          <tbody>
            {recruiters.map((recruiter) => (
              <tr key={recruiter.id}>
                <td>{recruiter.recruiterId}</td>
                <td>{recruiter.name}</td>
                <td>{recruiter.email || "-"}</td>
                <td>{recruiter.phoneNumber || "-"}</td>
                <td>{recruiter.designation || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </SuiteShell>
  );
}
