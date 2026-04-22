"use client";

import SuiteShell from "@/components/suite-shell";

export default function SettingsPageClient({ settings }) {
  return (
    <SuiteShell
      eyebrow="Company Settings"
      title="Departments, Holidays, Payroll Rules, and Approval Levels"
      primaryHref="/employee-portal"
      primaryLabel="Employee Portal"
      brandEyebrow="Admin Suite"
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Policy Engine</p>
            <h3>Configurable company rules</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Rule</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.id}>
                <td>{setting.category}</td>
                <td>{setting.name}</td>
                <td>{setting.value}</td>
                <td>{setting.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Master Data</p>
              <h3>Operating structure</h3>
            </div>
          </div>
          <div className="chip-row">
            <span>Departments</span>
            <span>Branches</span>
            <span>Grades</span>
            <span>Holidays</span>
            <span>Shift Rosters</span>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Security</p>
              <h3>Corporate defaults</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Role-based access</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>Audit logs</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>SSO readiness</span><strong>Planned</strong></div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
