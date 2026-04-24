"use client";

import { useEffect, useState } from "react";
import BarChart from "@/components/bar-chart";

import FilterChips from "@/components/filter-chips";
import SuiteShell from "@/components/suite-shell";
import DashboardHero from "@/components/features/dashboard/dashboard-hero";
import DashboardSummary from "@/components/features/dashboard/dashboard-summary";
import RunboardPanel from "@/components/features/payroll/runboard-panel";
import AdminPanel from "@/components/features/admin/admin-panel";
import { dashboardChartSets, dashboardMetrics } from "@/lib/demo-data";

export default function DashboardPageClient() {

  const [range, setRange] = useState("30D");
  const [metrics, setMetrics] = useState(dashboardMetrics);

  useEffect(() => {
    let cancelled = false;

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();
        if (!cancelled && payload.metrics) {
          setMetrics(payload.metrics);
        }
      } catch {
        if (!cancelled) {
          setMetrics(dashboardMetrics);
        }
      }
    }

    loadBootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const chartSet = dashboardChartSets[range];

  return (
    <SuiteShell
      eyebrow="Executive Dashboard"
      title="Unified Workforce Command"
      primaryHref="/ats"
      primaryLabel="Open ATS"

    >
      <DashboardHero metrics={metrics} />
      
      <section className="page-section">
        <RunboardPanel />
      </section>

      <DashboardSummary />

      <section className="page-section split-grid">
        <article className="panel chart-filter-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Executive Time Range</p>
              <h3>Adjust KPI horizon</h3>
            </div>
          </div>
          <FilterChips options={["30D", "QTD", "YTD"]} value={range} onChange={setRange} />
        </article>
        <BarChart
          eyebrow="Hiring Velocity"
          title="Weekly role closure trend"
          summary={chartSet.hiring.summary}
          items={chartSet.hiring.items}
        />
        <BarChart
          eyebrow="Vendor Health"
          title="Service category performance"
          summary={chartSet.vendor.summary}
          items={chartSet.vendor.items}
        />
      </section>

      <section className="page-section">
        <AdminPanel />
      </section>


    </SuiteShell>
  );
}
