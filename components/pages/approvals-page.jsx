"use client";

import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

export default function ApprovalsPageClient({ approvals }) {
  return (
    <SuiteShell
      eyebrow="Approval Inbox"
      title="Cross-Module Approval Command"
      primaryHref="/reports"
      primaryLabel="Open Reports"
      brandEyebrow="Governance Suite"
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Unified Queue</p>
            <h3>Leave, payroll, invoice, and vendor approvals</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Request</th>
              <th>Owner</th>
              <th>Value</th>
              <th>Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval) => (
              <tr key={approval.id}>
                <td>{approval.module}</td>
                <td>{approval.title}</td>
                <td>{approval.owner}</td>
                <td>{approval.amount}</td>
                <td>{approval.level}</td>
                <td><StatusBadge tone={approval.tone}>{approval.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Approval Chain</p>
              <h3>Enterprise sign-off rules</h3>
            </div>
          </div>
          <div className="flow-grid">
            <div className="flow-card"><strong>Manager</strong><small>Employee and leave validation</small></div>
            <div className="flow-card"><strong>Operations</strong><small>Attendance and manpower verification</small></div>
            <div className="flow-card"><strong>Finance</strong><small>Tax, invoice, and payment release</small></div>
            <div className="flow-card"><strong>Admin</strong><small>Policy override and final control</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Risk Guardrails</p>
              <h3>Before approval</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Missing attendance lock</span><strong>Block payroll</strong></div>
            <div className="doc-line"><span>Vendor KYC expired</span><strong>Hold invoice</strong></div>
            <div className="doc-line"><span>Bank details pending</span><strong>Hold salary</strong></div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
