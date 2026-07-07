"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";

import SuiteShell from "@/components/suite-shell";
import { getSuiteSession } from "@/lib/auth-session";

const REFRESH_MS = 30000;
const PREF_KEY = "talme-dashboard-personalization-v2";
const ranges = [
  ["today", "Today"],
  ["7d", "7 Days"],
  ["30d", "30 Days"],
  ["quarter", "Quarter"],
  ["year", "Year"]
];

const emptyDashboard = {
  generatedAt: null,
  range: { key: "30d", label: "30 Days" },
  visibleWidgets: [],
  hero: [],
  kpis: [],
  attendance: {},
  recruitment: {},
  employeeStats: {},
  payrollStats: {},
  leaveShift: {},
  approvalCenter: [],
  insights: [],
  operations: {},
  vendorSummary: {},
  performance: {},
  reports: [],
  loans: {},
  documentCenter: {},
  notifications: [],
  systemHealth: {},
  activity: []
};

function sessionRole() {
  return getSuiteSession()?.user?.role || "Enterprise Admin";
}

function dashboardApiPath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

async function loadDashboard(range, role) {
  const session = getSuiteSession();
  console.log("[dashboard] request", {
    roleQuery: role,
    authenticatedSessionRole: session?.user?.role || null,
    includesSessionToken: Boolean(session?.token)
  });

  const response = await fetch(dashboardApiPath(`/api/dashboard?range=${encodeURIComponent(range)}&role=${encodeURIComponent(role)}`), {
    cache: "no-store",
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined
  });

  if (!response.ok) {
    throw new Error(`Dashboard API returned ${response.status}`);
  }

  const payload = await response.json();
  console.log("[dashboard] response", payload);
  console.log("[dashboard] visibility", {
    authenticatedRole: payload.dashboardDebug?.authenticatedRole,
    normalizedRole: payload.dashboardDebug?.normalizedRole || payload.role,
    widgetCount: payload.dashboardDebug?.widgetCount ?? payload.visibleWidgets?.length ?? 0,
    visibleWidgetIds: payload.dashboardDebug?.visibleWidgetIds || payload.visibleWidgetIds || payload.visibleWidgets?.map((widget) => widget.id) || []
  });

  return payload;
}

export default function DashboardPageClient() {
  const [range, setRange] = useState("30d");
  const [role, setRole] = useState("Enterprise Admin");
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [liveMode, setLiveMode] = useState("polling");
  const [preferences, setPreferences] = useState({ order: [], hidden: [] });

  useEffect(() => {
    setRole(sessionRole());
    try {
      const stored = JSON.parse(window.localStorage.getItem(PREF_KEY) || "null");
      if (stored?.order || stored?.hidden) {
        setPreferences({ order: stored.order || [], hidden: stored.hidden || [] });
      }
    } catch {
      setPreferences({ order: [], hidden: [] });
    }
  }, []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const payload = await loadDashboard(range, role);
      setDashboard(payload);
      setError("");
    } catch (loadError) {
      setError(loadError?.message || "Dashboard data failed to load.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, role]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.EventSource) {
      setLiveMode("polling");
      refresh();
      const interval = window.setInterval(() => refresh({ silent: true }), REFRESH_MS);
      return () => window.clearInterval(interval);
    }

    let settled = false;
    const source = new EventSource(dashboardApiPath(`/api/dashboard/stream?range=${encodeURIComponent(range)}&role=${encodeURIComponent(role)}`));
    const fallback = window.setTimeout(() => {
      if (settled) return;
      setLiveMode("polling");
      refresh();
    }, 5000);

    setLoading(true);
    source.addEventListener("dashboard", (event) => {
      const payload = JSON.parse(event.data);
      settled = true;
      window.clearTimeout(fallback);
      setLiveMode("sse");
      console.log("[dashboard] stream response", payload);
      console.log("[dashboard] visibility", {
        authenticatedRole: payload.dashboardDebug?.authenticatedRole,
        normalizedRole: payload.dashboardDebug?.normalizedRole || payload.role,
        widgetCount: payload.dashboardDebug?.widgetCount ?? payload.visibleWidgets?.length ?? 0,
        visibleWidgetIds: payload.dashboardDebug?.visibleWidgetIds || payload.visibleWidgetIds || payload.visibleWidgets?.map((widget) => widget.id) || []
      });
      setDashboard(payload);
      setError("");
      setLoading(false);
      setRefreshing(false);
    });
    source.addEventListener("error", () => {
      source.close();
      window.clearTimeout(fallback);
      setLiveMode("polling");
      refresh();
    });

    return () => {
      window.clearTimeout(fallback);
      source.close();
    };
  }, [range, role, refresh]);

  useEffect(() => {
    if (liveMode !== "polling") return undefined;

    const interval = window.setInterval(() => refresh({ silent: true }), REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [liveMode, refresh]);

  const widgets = useMemo(() => {
    return Array.isArray(dashboard.visibleWidgets) ? dashboard.visibleWidgets : [];
  }, [dashboard.visibleWidgets]);

  function savePreferences(nextPreferences) {
    setPreferences(nextPreferences);
    window.localStorage.setItem(PREF_KEY, JSON.stringify(nextPreferences));
  }

  function moveWidget(id, direction) {
    const order = widgets.map((widget) => widget.id);
    const index = order.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    savePreferences({ ...preferences, order });
  }

  function hideWidget(id) {
    savePreferences({ ...preferences, hidden: Array.from(new Set([...preferences.hidden, id])) });
  }

  function resetWidgets() {
    savePreferences({ order: [], hidden: [] });
  }

  return (
    <SuiteShell
      eyebrow="Executive Dashboard"
      title="Unified Workforce Command"
      primaryHref="/reports"
      primaryLabel="Open Reports"
      actions={
        <DashboardActions
          generatedAt={dashboard.generatedAt}
          range={range}
          refreshing={refreshing}
          liveMode={liveMode}
          onRefresh={() => refresh({ silent: true })}
        />
      }
    >
      <section className="dashboard-toolbar" aria-label="Dashboard controls">
        <div className="filter-row" role="radiogroup" aria-label="Date range">
          {ranges.map(([value, label]) => (
            <button
              className={range === value ? "active-chip" : ""}
              key={value}
              onClick={() => setRange(value)}
              role="radio"
              aria-checked={range === value}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <button className="ghost-button" onClick={resetWidgets} type="button">
          Reset Widgets
        </button>
      </section>

      {error ? <div className="dashboard-alert" role="alert">{error}</div> : null}

      <div className="executive-dashboard-shell">
        <div className="executive-dashboard-main" aria-busy={loading || refreshing}>
          {widgets.map((widget, index) => (
            <WidgetFrame
              key={widget.id}
              widget={widget}
              range={range}
              role={role}
              loading={loading}
              error={error}
              canMoveUp={index > 0}
              canMoveDown={index < widgets.length - 1}
              onMoveUp={() => moveWidget(widget.id, -1)}
              onMoveDown={() => moveWidget(widget.id, 1)}
              onHide={() => hideWidget(widget.id)}
            >
              <WidgetRenderer id={widget.id} dashboard={dashboard} loading={loading} error={error} />
            </WidgetFrame>
          ))}
          {!loading && Array.isArray(dashboard.visibleWidgets) && dashboard.visibleWidgets.length === 0 ? (
            <p className="empty-state">No dashboard widgets are visible for this role.</p>
          ) : null}
        </div>
        <DashboardUtilityPanel dashboard={dashboard} loading={loading} error={error} range={range} role={role} />
      </div>
    </SuiteShell>
  );
}

const DashboardActions = memo(function DashboardActions({ generatedAt, range, refreshing, liveMode, onRefresh }) {
  return (
    <>
      <span className="dashboard-live-stamp" aria-live="polite">
        {liveMode === "sse" ? "Live stream" : "Polling"} | Last sync {formatUpdatedAt(generatedAt)}
      </span>
      <a className="ghost-button" href={exportHref("kpis", "csv", range)} target="_blank" rel="noreferrer">
        Export CSV
      </a>
      <button className="primary-button" disabled={refreshing} onClick={onRefresh} type="button">
        {refreshing ? "Refreshing" : "Refresh Dashboard"}
      </button>
    </>
  );
});

const WidgetFrame = memo(function WidgetFrame({
  widget,
  range,
  role,
  children,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onHide
}) {
  return (
    <section className="dashboard-section" aria-labelledby={`dashboard-widget-${widget.id}`}>
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Operational Widget</p>
          <h3 id={`dashboard-widget-${widget.id}`}>{widget.title}</h3>
        </div>
        <div className="dashboard-widget-actions" aria-label={`${widget.title} actions`}>
          <button className="mini-button" disabled={!canMoveUp} onClick={onMoveUp} type="button">Up</button>
          <button className="mini-button" disabled={!canMoveDown} onClick={onMoveDown} type="button">Down</button>
          <button className="mini-button" onClick={onHide} type="button">Hide</button>
          <a className="mini-button" href={exportHref(widget.id, "csv", range, role)} target="_blank" rel="noreferrer">CSV</a>
          <a className="mini-button" href={exportHref(widget.id, "excel", range, role)} target="_blank" rel="noreferrer">Excel</a>
          <a className="mini-button" href={exportHref(widget.id, "pdf", range, role)} target="_blank" rel="noreferrer">PDF</a>
        </div>
      </div>
      {children}
    </section>
  );
});

const WidgetRenderer = memo(function WidgetRenderer({ id, dashboard, loading, error }) {
  if (id === "hero") return <ExecutiveHero metrics={dashboard.hero} loading={loading} error={error} />;
  if (id === "kpis") return <KpiGrid items={dashboard.kpis} loading={loading} error={error} />;
  if (id === "attendance") return <AttendanceWidget data={dashboard.attendance} loading={loading} error={error} />;
  if (id === "recruitment") return <RecruitmentWidget data={dashboard.recruitment} loading={loading} error={error} />;
  if (id === "employees") return <EmployeeWidget data={dashboard.employeeStats} loading={loading} error={error} />;
  if (id === "payroll") return <PayrollWidget data={dashboard.payrollStats} loading={loading} error={error} />;
  if (id === "leaveShift") return <LeaveShiftWidget data={dashboard.leaveShift} loading={loading} error={error} />;
  if (id === "approvals") return <ApprovalCenter items={dashboard.approvalCenter} loading={loading} error={error} />;
  if (id === "insights") return <AIInsights insights={dashboard.insights} loading={loading} error={error} />;
  if (id === "operations") return <DailyOperations data={dashboard.operations} loading={loading} error={error} />;
  if (id === "enterprise") return <VendorPerformanceReports dashboard={dashboard} loading={loading} error={error} />;
  if (id === "compliance") return <LoanDocumentCenter dashboard={dashboard} loading={loading} error={error} />;
  return <p className="empty-state">Widget is unavailable.</p>;
});

function ExecutiveHero({ metrics = [], loading, error }) {
  return (
    <div className="dashboard-command-hero">
      <div>
        <p className="eyebrow">Real-time Enterprise Command Center</p>
        <h2>Workforce health, payroll, hiring, approvals, vendors, documents, and system signals in one place.</h2>
      </div>
      <div className="dashboard-hero-grid">
        <MetricTiles items={metrics} loading={loading} error={error} />
      </div>
    </div>
  );
}

function KpiGrid({ items = [], loading, error }) {
  return (
    <div className="dashboard-kpi-grid">
      {loading ? skeletons(6, "card") : null}
      {!loading && error ? <StateMessage type="error" message="KPI data is temporarily unavailable." /> : null}
      {!loading && !error && !items.length ? <StateMessage message="No KPI data available for this role and range." /> : null}
      {!loading && !error ? items.map((item) => <KpiCard item={item} key={item.id || item.label} />) : null}
    </div>
  );
}

function KpiCard({ item }) {
  return (
    <a className="dashboard-kpi-card" href={item.href}>
      <div className="dashboard-card-head">
        <span>{item.label}</span>
        <Badge tone={item.tone}>{item.badge}</Badge>
      </div>
      <strong className="dashboard-animated-value">{item.value}</strong>
      <div className="dashboard-kpi-meta">
        <small>{item.trend}</small>
        <small>{Number(item.trendPercent) >= 0 ? "Up" : "Down"}</small>
      </div>
      <Sparkline values={item.sparkline} />
    </a>
  );
}

function AttendanceWidget({ data = {}, loading, error }) {
  return (
    <>
      <MetricStrip items={data.metrics} loading={loading} error={error} />
      <div className="dashboard-widget-grid three">
        <MiniBarChart title="Weekly Attendance" items={data.weekly} loading={loading} />
        <MiniLineChart title="Monthly Attendance Trend" items={data.monthly} loading={loading} />
        <ProgressList title="Department Attendance" items={data.departments} loading={loading} />
      </div>
      <Heatmap title="Shift Distribution" items={data.shifts} loading={loading} />
    </>
  );
}

function RecruitmentWidget({ data = {}, loading, error }) {
  return (
    <>
      <MetricStrip items={data.metrics} loading={loading} error={error} />
      <div className="dashboard-widget-grid two">
        <FunnelChart title="Recruitment Funnel" items={data.funnel} loading={loading} />
        <MiniBarChart title="Hiring Trend" items={data.trend} loading={loading} />
      </div>
      <div className="dashboard-widget-grid two">
        <ListPanel title="Upcoming Interviews" items={data.upcomingInterviews} empty="No interviews scheduled." href="/ats" loading={loading} />
        <ListPanel title="Recent Candidates" items={data.recentCandidates} empty="No candidates found." href="/ats" loading={loading} />
      </div>
    </>
  );
}

function EmployeeWidget({ data = {}, loading, error }) {
  return (
    <>
      <MetricStrip items={data.metrics} loading={loading} error={error} />
      <div className="dashboard-widget-grid two">
        <ProgressList title="Department Distribution" items={data.departments} loading={loading} />
        <DonutPanel title="Gender Distribution" items={data.gender} loading={loading} />
      </div>
      <div className="dashboard-widget-grid two">
        <MiniLineChart title="Employee Growth Chart" items={data.growth} loading={loading} />
        <ProgressList title="Employee Locations" items={data.locations} loading={loading} />
      </div>
    </>
  );
}

function PayrollWidget({ data = {}, loading, error }) {
  return (
    <>
      <MetricStrip items={data.metrics} loading={loading} error={error} />
      <MiniBarChart title="Salary Trend" items={data.salaryTrend} loading={loading} />
    </>
  );
}

function LeaveShiftWidget({ data = {}, loading, error }) {
  return (
    <>
      <MetricStrip items={data.metrics} loading={loading} error={error} />
      <div className="dashboard-widget-grid two">
        <MiniLineChart title="Leave Trend" items={data.trend} loading={loading} />
        <ListPanel title="Upcoming Holidays" items={data.upcomingHolidays} empty="Holiday calendar is clear." href="/leaves" loading={loading} />
      </div>
    </>
  );
}

function ApprovalCenter({ items = [], loading, error }) {
  return (
    <div className="dashboard-approval-grid">
      <MetricTiles items={items} loading={loading} error={error} className="dashboard-approval-card" />
    </div>
  );
}

function AIInsights({ insights = [], loading, error }) {
  return (
    <div className="dashboard-insight-grid">
      {loading ? skeletons(6, "block") : null}
      {!loading && error ? <StateMessage type="error" message="Insights are temporarily unavailable." /> : null}
      {!loading && !error && !insights.length ? <StateMessage message="No insights for this range." /> : null}
      {!loading && !error ? insights.map((insight) => (
        <a className="dashboard-insight-card" href={insight.href} key={insight.label}>
          <Badge tone={insight.tone}>{insight.tone === "teal" ? "Stable" : insight.tone === "gold" ? "Watch" : "Info"}</Badge>
          <strong>{insight.label}</strong>
          <small>{insight.value}</small>
        </a>
      )) : null}
    </div>
  );
}

function DailyOperations({ data = {}, loading, error }) {
  return (
    <>
      <div className="dashboard-widget-grid three">
        <MetricPanel title="Today's Tasks" items={data.tasks} loading={loading} error={error} />
        <ListPanel title="Today's Meetings" items={data.meetings} empty="No meetings found." href="/ats" loading={loading} />
        <ListPanel title="Recent Updates" items={data.updates} empty="No daily updates posted." href="/daily-updates" loading={loading} />
      </div>
      <div className="dashboard-widget-grid two">
        <ListPanel title="Today's Joining" items={data.joining} empty="No joining events today." href="/hrms" loading={loading} />
        <ListPanel title="Today's Exit" items={data.exits} empty="No exit events today." href="/hrms" loading={loading} />
      </div>
    </>
  );
}

function VendorPerformanceReports({ dashboard, loading, error }) {
  return (
    <>
      <div className="dashboard-widget-grid three">
        <MetricPanel title="Vendor Portal Summary" items={dashboard.vendorSummary?.metrics} loading={loading} error={error} />
        <MetricPanel title="Performance Dashboard" items={dashboard.performance?.metrics} loading={loading} error={error} />
        <ReportsPanel items={dashboard.reports} loading={loading} error={error} />
      </div>
      <div className="dashboard-widget-grid two">
        <ListPanel title="Top Performers" items={dashboard.performance?.top} empty="No performance ratings captured through the backend yet." href="/performance-ratings" loading={loading} />
        <MiniLineChart title="Performance Trend" items={dashboard.performance?.trend} loading={loading} />
      </div>
    </>
  );
}

function LoanDocumentCenter({ dashboard, loading, error }) {
  return (
    <div className="dashboard-widget-grid two">
      <MetricPanel title="Loan & Arrears" items={dashboard.loans?.metrics} loading={loading} error={error} />
      <MetricPanel title="Document Center" items={dashboard.documentCenter?.metrics} loading={loading} error={error} />
    </div>
  );
}

const DashboardUtilityPanel = memo(function DashboardUtilityPanel({ dashboard, loading, error, range, role }) {
  return (
    <aside className="dashboard-utility-panel">
      <div className="dashboard-utility-sticky">
        <UtilitySection title="Notifications" widget="notifications" range={range} role={role}>
          <ListPanel items={dashboard.notifications} empty="No notifications." href="/notifications" loading={loading} />
        </UtilitySection>
        <UtilitySection title="System Health" widget="systemHealth" range={range} role={role}>
          <MetricPanel items={dashboard.systemHealth?.metrics} loading={loading} error={error} />
        </UtilitySection>
        <UtilitySection title="Activity Timeline" widget="activity" range={range} role={role}>
          <ActivityTimeline items={dashboard.activity} loading={loading} />
        </UtilitySection>
      </div>
    </aside>
  );
});

function UtilitySection({ title, widget, range, role, children }) {
  return (
    <section className="dashboard-section compact" aria-labelledby={`dashboard-utility-${widget}`}>
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow">Utility Panel</p>
          <h3 id={`dashboard-utility-${widget}`}>{title}</h3>
        </div>
        <a className="mini-button" href={exportHref(widget, "csv", range, role)} target="_blank" rel="noreferrer">CSV</a>
      </div>
      {children}
    </section>
  );
}

function MetricStrip({ items = [], loading, error }) {
  return (
    <div className="dashboard-metric-strip">
      <MetricTiles items={items} loading={loading} error={error} className="dashboard-mini-stat" />
    </div>
  );
}

function MetricTiles({ items = [], loading, error, className = "dashboard-hero-tile" }) {
  if (loading) return skeletons(Math.max(1, items?.length || 4), "line");
  if (error) return <StateMessage type="error" message="Widget data is temporarily unavailable." />;
  if (!items?.length) return <StateMessage message="No records found for this widget." />;

  return items.map((item) => (
    <a className={className} href={item.href || "/dashboard"} key={item.label}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      {item.tone ? <Badge tone={item.tone}>{item.tone === "teal" ? "Healthy" : item.tone === "gold" ? "Watch" : "Info"}</Badge> : null}
    </a>
  ));
}

function MetricPanel({ title, items = [], loading, error }) {
  return (
    <article className="dashboard-panel-card">
      {title ? <h4>{title}</h4> : null}
      <div className="dashboard-key-value-list">
        <MetricTiles items={items} loading={loading} error={error} className="dashboard-key-value" />
      </div>
    </article>
  );
}

function ReportsPanel({ items = [], loading, error }) {
  return (
    <article className="dashboard-panel-card">
      <h4>Quick Reports</h4>
      <div className="dashboard-report-grid">
        <MetricTiles items={items} loading={loading} error={error} />
      </div>
    </article>
  );
}

function ListPanel({ title, items = [], empty, href = "#", loading }) {
  const visibleItems = useMemo(() => (items || []).slice(0, 30), [items]);

  return (
    <article className="dashboard-panel-card">
      {title ? <h4>{title}</h4> : null}
      <div className="dashboard-list virtual-list" tabIndex={0} aria-label={title || "Records"}>
        {loading ? skeletons(4, "line") : null}
        {!loading && visibleItems.length ? visibleItems.map((item, index) => (
          <a href={item.href || href} key={item.id || `${title || "item"}-${index}`}>
            <strong>{item.name || item.employee || item.subject || item.title || item.authorName || item.label || `Item ${index + 1}`}</strong>
            <small>{item.role || item.stage || item.status || item.message || item.department || item.value || item.owner || "Live record"}</small>
          </a>
        )) : null}
        {!loading && !visibleItems.length ? <p className="empty-state">{empty || "No records found."}</p> : null}
      </div>
    </article>
  );
}

function ActivityTimeline({ items = [], loading }) {
  return (
    <div className="dashboard-timeline virtual-list" tabIndex={0} aria-label="Recent activity">
      {loading ? skeletons(5, "line") : null}
      {!loading && items.length ? items.slice(0, 30).map((item, index) => (
        <a href={item.href} key={`${item.label}-${index}`}>
          <Badge tone={item.tone}>{formatUpdatedAt(item.time)}</Badge>
          <strong>{item.label}</strong>
          <small>{item.value}</small>
        </a>
      )) : null}
      {!loading && !items.length ? <p className="empty-state">No activity yet.</p> : null}
    </div>
  );
}

function MiniBarChart({ title, items = [], loading }) {
  const rows = normalizeChart(items);
  const max = Math.max(1, ...rows.map((item) => item.height));

  return (
    <article className="dashboard-panel-card">
      <h4>{title}</h4>
      <div className="dashboard-bars" role="img" aria-label={title}>
        {loading ? skeletons(5, "block") : null}
        {!loading && rows.length ? rows.map((item) => (
          <div className="dashboard-bar-item" key={item.label}>
            <div><span style={{ height: `${Math.max(8, (item.height / max) * 100)}%` }} /></div>
            <strong>{item.value}</strong>
            <small>{item.label}</small>
          </div>
        )) : null}
        {!loading && !rows.length ? <p className="empty-state">No chart data.</p> : null}
      </div>
    </article>
  );
}

function MiniLineChart({ title, items = [], loading }) {
  const rows = normalizeChart(items);
  const max = Math.max(1, ...rows.map((item) => Number(item.value) || 0));
  const points = rows.map((item, index) => {
    const x = rows.length <= 1 ? 8 : 8 + (index / (rows.length - 1)) * 84;
    const y = 54 - ((Number(item.value) || 0) / max) * 44;
    return `${x},${y}`;
  });

  return (
    <article className="dashboard-panel-card">
      <h4>{title}</h4>
      {loading ? <SkeletonBlock /> : null}
      {!loading && rows.length ? (
        <>
          <svg className="dashboard-line-chart" viewBox="0 0 100 60" role="img" aria-label={title}>
            <polyline points={points.join(" ")} />
            {points.map((point) => {
              const [cx, cy] = point.split(",");
              return <circle cx={cx} cy={cy} key={point} r="2.5" />;
            })}
          </svg>
          <div className="dashboard-chart-labels">
            {rows.map((item) => <span key={item.label}>{item.label}</span>)}
          </div>
        </>
      ) : null}
      {!loading && !rows.length ? <p className="empty-state">No trend data.</p> : null}
    </article>
  );
}

function ProgressList({ title, items = [], loading }) {
  const rows = normalizeChart(items);
  const max = Math.max(1, ...rows.map((item) => Number(item.value) || 0));

  return (
    <article className="dashboard-panel-card">
      <h4>{title}</h4>
      <div className="dashboard-progress-list">
        {loading ? skeletons(4, "line") : null}
        {!loading && rows.length ? rows.map((item) => (
          <div className="dashboard-progress-row" key={item.label}>
            <div><span>{item.label}</span><strong>{item.value}</strong></div>
            <progress max="100" value={((Number(item.value) || 0) / max) * 100}>{item.value}</progress>
          </div>
        )) : null}
        {!loading && !rows.length ? <p className="empty-state">No records to compare.</p> : null}
      </div>
    </article>
  );
}

function DonutPanel({ title, items = [], loading }) {
  const rows = normalizeChart(items);
  const total = rows.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const primary = total ? Math.round(((Number(rows[0]?.value) || 0) / total) * 100) : 0;

  return (
    <article className="dashboard-panel-card dashboard-donut-panel">
      <h4>{title}</h4>
      {loading ? <SkeletonBlock /> : null}
      {!loading && rows.length ? (
        <>
          <div className="dashboard-donut" style={{ "--donut": `${primary}%` }}><strong>{primary}%</strong></div>
          <div className="dashboard-key-value-list">
            {rows.map((item) => <div className="dashboard-key-value" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
          </div>
        </>
      ) : null}
      {!loading && !rows.length ? <p className="empty-state">No demographic data captured.</p> : null}
    </article>
  );
}

function FunnelChart({ title, items = [], loading }) {
  return <ProgressList title={title} items={items} loading={loading} />;
}

function Heatmap({ title, items = [], loading }) {
  const rows = normalizeChart(items);

  return (
    <article className="dashboard-panel-card">
      <h4>{title}</h4>
      <div className="dashboard-heatmap">
        {loading ? skeletons(8, "block") : null}
        {!loading && rows.length ? rows.map((item) => (
          <span key={item.label} style={{ "--heat": `${Math.max(18, item.height || item.value)}%` }}>
            <strong>{item.value}</strong>
            {item.label}
          </span>
        )) : null}
        {!loading && !rows.length ? <p className="empty-state">No shift data available.</p> : null}
      </div>
    </article>
  );
}

function Badge({ tone = "slate", children }) {
  return <span className={`dashboard-badge ${tone}`}>{children}</span>;
}

function Sparkline({ values = [] }) {
  const rows = values.length ? values.map((value) => Number(value) || 0) : [0, 0, 0];
  const max = Math.max(1, ...rows);
  const points = rows.map((value, index) => {
    const x = rows.length <= 1 ? 2 : 2 + (index / (rows.length - 1)) * 96;
    const y = 34 - (value / max) * 28;
    return `${x},${y}`;
  });

  return (
    <svg className="dashboard-sparkline" viewBox="0 0 100 38" role="img" aria-label="KPI sparkline">
      <polyline points={points.join(" ")} />
    </svg>
  );
}

function StateMessage({ message, type = "empty" }) {
  return <p className={`empty-state ${type === "error" ? "dashboard-error-state" : ""}`}>{message}</p>;
}

function SkeletonBlock() {
  return <span className="dashboard-skeleton block" aria-hidden="true" />;
}

function SkeletonLine() {
  return <span className="dashboard-skeleton line" aria-hidden="true" />;
}

function skeletons(count, type) {
  return Array.from({ length: count }, (_, index) => type === "block" || type === "card" ? <SkeletonBlock key={index} /> : <SkeletonLine key={index} />);
}

function normalizeChart(items = []) {
  return items.map((item) => ({
    label: item.label,
    value: Number(String(item.value ?? 0).replace(/[^\d.-]/g, "")) || 0,
    height: item.height || Number(String(item.value ?? 0).replace(/[^\d.-]/g, "")) || 0
  }));
}

function exportHref(widget, format, range, role = sessionRole()) {
  return dashboardApiPath(`/api/dashboard/export?widget=${encodeURIComponent(widget)}&format=${encodeURIComponent(format)}&range=${encodeURIComponent(range)}&role=${encodeURIComponent(role)}`);
}

function formatUpdatedAt(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "pending";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
