"use client";

import SuiteShell from "@/components/suite-shell";
import StatusBadge from "@/components/status-badge";

export default function HrmsPageClient() {
  return (
    <SuiteShell
      eyebrow="HRMS Module"
      title="Employee Lifecycle, Attendance, and Performance"
      primaryHref="/payroll"
      primaryLabel="Open Payroll"
      brandEyebrow="HRMS Suite"
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Lifecycle</p>
              <h3>From onboarding to exit</h3>
            </div>
          </div>
          <div className="timeline-grid">
            <div className="process-card"><strong>01</strong><small>Offer Accepted</small></div>
            <div className="process-card"><strong>02</strong><small>Onboarding</small></div>
            <div className="process-card"><strong>03</strong><small>Document Verification</small></div>
            <div className="process-card"><strong>04</strong><small>Shift Allocation</small></div>
            <div className="process-card"><strong>05</strong><small>Confirmation</small></div>
            <div className="process-card"><strong>06</strong><small>Transfer or Exit</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Employee Control</p>
              <h3>Profile snapshot</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Employee ID</span><strong>TLM-2048</strong></div>
            <div className="doc-line"><span>Department</span><strong>Workforce Operations</strong></div>
            <div className="doc-line"><span>Grade</span><strong>L3</strong></div>
            <div className="doc-line"><span>Status</span><strong>Confirmed</strong></div>
          </div>
        </article>
      </section>

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Attendance &amp; T&amp;A</p>
              <h3>Monthly attendance sheet</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Present</th>
                <th>Leaves</th>
                <th>OT</th>
                <th>Shift</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Manish Gupta</td><td>24</td><td>1</td><td>8</td><td>A</td><td><StatusBadge tone="teal">Closed</StatusBadge></td></tr>
              <tr><td>Priya S.</td><td>22</td><td>2</td><td>4</td><td>B</td><td><StatusBadge tone="gold">Review</StatusBadge></td></tr>
              <tr><td>Karan Das</td><td>26</td><td>0</td><td>12</td><td>General</td><td><StatusBadge tone="teal">Approved</StatusBadge></td></tr>
            </tbody>
          </table>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Exceptions</p>
              <h3>Operational alerts</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="process-card"><strong>Late Punch Cluster</strong><small>Transport team missed geofence sync</small></div>
            <div className="process-card"><strong>Shift Variance</strong><small>Housekeeping reassignment pending approval</small></div>
            <div className="process-card"><strong>Overtime Review</strong><small>Security OT exceeded plan by 14 hours</small></div>
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Performance</p>
              <h3>Quarterly scorecards</h3>
            </div>
          </div>
          <div className="score-grid">
            <div className="score-card"><strong>4.8</strong><small>HR Operations</small></div>
            <div className="score-card"><strong>4.5</strong><small>Vendor SLA</small></div>
            <div className="score-card"><strong>4.7</strong><small>Attendance Discipline</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Movement &amp; Documents</p>
              <h3>Control panel</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Movement Requests</span><strong>02 Open</strong></div>
            <div className="doc-line"><span>KYC &amp; ID Proof</span><strong>Verified</strong></div>
            <div className="doc-line"><span>Statutory Enrollment</span><strong>In Progress</strong></div>
            <div className="doc-line"><span>Manager Confirmation</span><strong>Scheduled</strong></div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
