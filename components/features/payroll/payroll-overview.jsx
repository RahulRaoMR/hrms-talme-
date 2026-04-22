export default function PayrollOverview() {
  return (
    <>
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Runboard</p>
              <h3>Payroll stages</h3>
            </div>
          </div>
          <div className="runboard">
            <div className="flow-card"><strong>1</strong><small>Attendance Locked</small></div>
            <div className="flow-card"><strong>2</strong><small>Earnings &amp; Deductions</small></div>
            <div className="flow-card"><strong>3</strong><small>Payroll Tax Validation</small></div>
            <div className="flow-card"><strong>4</strong><small>Bank File Release</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Disbursement Snapshot</p>
              <h3>Financial control</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Gross Payroll</span><strong>INR 1.84 Cr</strong></div>
            <div className="doc-line"><span>Payroll Tax</span><strong>INR 22.6 L</strong></div>
            <div className="doc-line"><span>Net Salary</span><strong>INR 1.51 Cr</strong></div>
            <div className="doc-line"><span>Salary Payment Date</span><strong>April 26</strong></div>
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Compliance</p>
              <h3>Tax and bank controls</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>PF / ESI Checks</span><strong>Closed</strong></div>
            <div className="doc-line"><span>TDS Validation</span><strong>Closed</strong></div>
            <div className="doc-line"><span>Bank Advice File</span><strong>Pending</strong></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Salary Payment</p>
              <h3>Release readiness</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Worker Bank Validation</span><strong>98.7%</strong></div>
            <div className="doc-line"><span>Payment Advice</span><strong>Queued</strong></div>
            <div className="doc-line"><span>Post-Payment Reconciliation</span><strong>Scheduled</strong></div>
          </div>
        </article>
      </section>
    </>
  );
}
