"use client";

import BarChart from "@/components/bar-chart";
import SuiteShell from "@/components/suite-shell";

export default function ReportsPageClient({ data }) {
  return (
    <SuiteShell
      eyebrow="Analytics Module"
      title="Advanced Reports and AI Screening"
      primaryHref="/documents"
      primaryLabel="Open Documents"
      brandEyebrow="Insight Suite"
    >
      <section className="page-section stats-grid">
        {data.scorecards.map((card) => (
          <article className="stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.meta}</small>
          </article>
        ))}
      </section>

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">AI Candidate Screening</p>
              <h3>Resume-to-role fit intelligence</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="process-card"><strong>Skill Extraction</strong><small>Parse resume skills, tenure, domain, and certifications.</small></div>
            <div className="process-card"><strong>JD Match Score</strong><small>Score candidates against role requirements and interview signals.</small></div>
            <div className="process-card"><strong>Shortlist Reasoning</strong><small>Explain why a profile should move, hold, or reject.</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Executive Signals</p>
              <h3>Auto-generated readout</h3>
            </div>
          </div>
          <div className="doc-stack">
            {data.aiSignals.map((signal) => (
              <div className="doc-line" key={signal}>
                <span>{signal}</span>
                <strong>Live</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section split-grid">
        <BarChart
          eyebrow="Headcount Trend"
          title="Department-wise workforce"
          summary={String(data.scorecards[0]?.value || "0")}
          items={data.charts.departments}
        />
        <BarChart
          eyebrow="Sourcing Mix"
          title="ATS source performance"
          summary={String(data.charts.sourcing.reduce((acc, item) => acc + Number(item.value), 0))}
          items={data.charts.sourcing}
        />
      </section>

      <section className="page-section split-grid">
        <BarChart
          eyebrow="Invoice Status"
          title="Payroll and vendor finance queue"
          summary={String(data.charts.invoices.reduce((acc, item) => acc + Number(item.value), 0))}
          items={data.charts.invoices}
        />
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Exports</p>
              <h3>PDF and audit-ready packs</h3>
            </div>
          </div>
          <div className="landing-actions">
            <a
              className="primary-button"
              href="/api/pdf/payslip?employee=Manish%20Gupta&month=April%202026&band=INR%209.6L"
              target="_blank"
              rel="noreferrer"
            >
              Payslip PDF
            </a>
            <a
              className="ghost-button"
              href="/api/pdf/invoice?vendor=StaffCore%20India&invoiceNo=INV-4388&amount=INR%2042,40,000&status=Approved"
              target="_blank"
              rel="noreferrer"
            >
              Invoice PDF
            </a>
            <a
              className="ghost-button"
              href="/api/pdf/offer?candidate=Neha%20Sharma&role=HRBP&location=Pune%20Plant&status=Draft"
              target="_blank"
              rel="noreferrer"
            >
              Offer PDF
            </a>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Generated PDFs use live query parameters</span><strong>Ready</strong></div>
            <div className="doc-line"><span>Suitable for payslips, offers, invoice summaries</span><strong>Corporate format</strong></div>
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Compliance Risk</p>
              <h3>Open control points</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Document risks</span><strong>{data.scorecards[4]?.value}</strong></div>
            <div className="doc-line"><span>Approval queue</span><strong>{data.scorecards[5]?.value}</strong></div>
            <div className="doc-line"><span>Notifications delivered</span><strong>{data.scorecards[6]?.value}</strong></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Analytics Status</p>
              <h3>Database-driven charts</h3>
            </div>
          </div>
          <div className="signal-row">
            <span className="teal">Headcount chart uses employee records</span>
            <span>Source chart uses ATS candidate data</span>
            <span className="gold">Invoice chart uses finance queue data</span>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
