export default function DashboardSummary() {
  return (
    <>
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Executive Priorities</p>
              <h3>Today&apos;s focus</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="process-card">
              <strong>Close 18 critical roles</strong>
              <small>ATS sourcing and business interviews</small>
            </div>
            <div className="process-card">
              <strong>Approve 7 vendor invoices</strong>
              <small>Finance and VMO approvals pending</small>
            </div>
            <div className="process-card">
              <strong>Release salary bank file</strong>
              <small>2 attendance exceptions remain open</small>
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Approval Queue</p>
              <h3>Control tower</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Offer Release</span><strong>04</strong></div>
            <div className="doc-line"><span>Attendance Lock</span><strong>02</strong></div>
            <div className="doc-line"><span>Vendor Invoice</span><strong>07</strong></div>
            <div className="doc-line"><span>Tax Validation</span><strong>01</strong></div>
          </div>
        </article>
      </section>

      <section className="page-section summary-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Capability Matrix</p>
              <h3>Module map</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="pill-card">ATS: requisition, sourcing, interview, offer</div>
            <div className="pill-card">HRMS: lifecycle, attendance, T&amp;A, performance</div>
            <div className="pill-card">Payroll: tax, disbursement, salary release</div>
            <div className="pill-card">VMS: registration, filters, invoice, payment</div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Live Signals</p>
              <h3>Operational health</h3>
            </div>
          </div>
          <div className="signal-row">
            <span className="teal">Hiring pace above plan</span>
            <span className="gold">Security vendor docs due</span>
            <span>Payroll risk low</span>
          </div>
        </article>
      </section>
    </>
  );
}
