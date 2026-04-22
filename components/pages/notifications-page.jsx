"use client";

import SuiteShell from "@/components/suite-shell";

export default function NotificationsPageClient() {
  return (
    <SuiteShell
      eyebrow="Communication Module"
      title="Communication and Notification Center"
      primaryHref="/dashboard"
      primaryLabel="Back To Dashboard"
      brandEyebrow="Communication Hub"
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Notification Feed</p>
              <h3>Live updates</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="process-card"><strong>Recruitment Alert</strong><small>Final interview panel updated for Plant HR Manager</small></div>
            <div className="process-card"><strong>Vendor Compliance</strong><small>Security vendor PF challan pending before release</small></div>
            <div className="process-card"><strong>Payroll Warning</strong><small>2 attendance exceptions must close before bank file generation</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Broadcast Composer</p>
              <h3>Audience setup</h3>
            </div>
          </div>
          <div className="form-grid">
            <label><span>Audience</span><input defaultValue="Vendors + Finance + Site Managers" /></label>
            <label><span>Channel</span><input defaultValue="Email, SMS, Dashboard" /></label>
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Audience Channels</p>
              <h3>Who receives what</h3>
            </div>
          </div>
          <div className="signal-row">
            <span className="teal">Recruiters and panelists</span>
            <span>Employees and managers</span>
            <span className="gold">Vendors and finance approvers</span>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Escalation Rules</p>
              <h3>Automated triggers</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Missed SLA</span><strong>Auto-alert in 15 min</strong></div>
            <div className="doc-line"><span>Payroll Exception</span><strong>Escalate to Finance</strong></div>
            <div className="doc-line"><span>Compliance Failure</span><strong>Block invoice release</strong></div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
