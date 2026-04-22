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
          title="Workforce strength"
          summary="96%"
          items={[
            { label: "HR", value: "18", height: 54 },
            { label: "Ops", value: "42", height: 82 },
            { label: "Payroll", value: "12", height: 46 },
            { label: "Security", value: "31", height: 70 },
            { label: "Vendor", value: "88", height: 92 }
          ]}
        />
        <BarChart
          eyebrow="Compliance Risk"
          title="Open control points"
          summary="Low"
          items={[
            { label: "KYC", value: "2", height: 35 },
            { label: "PF", value: "1", height: 24 },
            { label: "ESI", value: "1", height: 22 },
            { label: "Bank", value: "1", height: 30 },
            { label: "Invoice", value: "2", height: 42 }
          ]}
        />
      </section>
    </SuiteShell>
  );
}
