"use client";

import { useEffect, useState } from "react";
import BarChart from "@/components/bar-chart";
import SuiteShell from "@/components/suite-shell";

export default function ReportsPageClient({ data }) {
  const [reportData, setReportData] = useState(data);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    async function refreshReports() {
      try {
        const response = await fetch(apiUrl(`/api/reports?t=${Date.now()}`), {
          cache: "no-store"
        });

        if (!response.ok) return;

        const nextData = await response.json();

        if (!cancelled) {
          setReportData(nextData);
        }
      } finally {
        if (!cancelled) {
          window.clearTimeout(timeoutId);
          timeoutId = window.setTimeout(refreshReports, 5000);
        }
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        refreshReports();
      }
    }

    refreshReports();
    window.addEventListener("focus", refreshReports);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshReports);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return (
    <SuiteShell
      eyebrow="Analytics Module"
      title="Advanced Reports and AI Screening"
      primaryHref="/documents"
      primaryLabel="Open Documents"
      brandEyebrow="Insight Suite"
    >
      <section className="page-section stats-grid">
        {reportData.scorecards.map((card) => (
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
            {reportData.aiSignals.map((signal) => (
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
          summary={String(reportData.scorecards[0]?.value || "0")}
          items={reportData.charts.departments}
        />
        <BarChart
          eyebrow="Sourcing Mix"
          title="ATS source performance"
          summary={String(reportData.charts.sourcing.reduce((acc, item) => acc + Number(item.value), 0))}
          items={reportData.charts.sourcing}
        />
      </section>

    </SuiteShell>
  );
}
