"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import BarChart from "@/components/bar-chart";
import FilterChips from "@/components/filter-chips";
import EmployeeCtcBreakdownPanel from "@/components/features/payroll/employee-ctc-breakdown-panel";
import PayrollOverview from "@/components/features/payroll/payroll-overview";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { apiUrl } from "@/lib/api-client";
import { releasePayrollAction } from "@/lib/api-actions";
import { payrollChartSets } from "@/lib/demo-data";

const fallbackSummary = {
  metrics: [],
  stages: [],
  financialControl: [],
  readiness: [],
  notifications: [],
  activityFeed: [],
  aiInsights: [],
  approvalFlow: [],
  sla: [],
  paymentQueue: [],
  salaryWorkflow: [],
  charts: {
    payrollTrend: payrollChartSets.Monthly.disbursement,
    salaryAging: payrollChartSets.Monthly.aging,
    taxBreakdown: []
  }
};

function toneForStatus(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("ready") || normalized.includes("released") || normalized.includes("validated")) return "teal";
  if (normalized.includes("hold") || normalized.includes("failed")) return "slate";
  return "gold";
}

export default function PayrollPageClient() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [range, setRange] = useState("Monthly");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "employee", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [isPending, startTransition] = useTransition();
  const [releaseSummary, setReleaseSummary] = useState(null);
  const [summary, setSummary] = useState(fallbackSummary);
  const [lastUpdated, setLastUpdated] = useState("");

  async function refreshPayrollSummary() {
    try {
      const response = await fetch(apiUrl("/api/payroll/summary"), { cache: "no-store" });
      const payload = await response.json();
      setSummary({ ...fallbackSummary, ...payload });
      setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setSummary(fallbackSummary);
    }
  }

  useEffect(() => {
    refreshPayrollSummary();
    const timer = window.setInterval(refreshPayrollSummary, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const paymentRows = useMemo(
    () =>
      summary.paymentQueue.map((row) => {
        const override = statusOverrides[row.id];
        const status = override?.status || row.status;

        return {
          ...row,
          ...override,
          status,
          tone: toneForStatus(status)
        };
      }),
    [statusOverrides, summary.paymentQueue]
  );

  const visiblePayments = useMemo(() => {
    const filtered = paymentRows.filter((row) => {
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.employee.toLowerCase().includes(q) ||
        row.employeeId.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.bankStatus.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });

    return filtered.sort((a, b) => {
      const aValue = String(a[sort.key] || "").toLowerCase();
      const bValue = String(b[sort.key] || "").toLowerCase();
      return sort.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [paymentRows, query, sort, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visiblePayments.length / 6));
  const pagedPayments = visiblePayments.slice((page - 1) * 6, page * 6);
  const pagedIds = pagedPayments.map((row) => row.id);

  const chartSet =
    range === "Monthly"
      ? {
          disbursement: summary.charts.payrollTrend || payrollChartSets.Monthly.disbursement,
          aging: summary.charts.salaryAging || payrollChartSets.Monthly.aging
        }
      : payrollChartSets.Quarterly;

  const toggleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const updatePaymentStatus = (ids, status) => {
    setStatusOverrides((current) => {
      const next = { ...current };
      ids.forEach((id) => {
        next[id] = { status, tone: toneForStatus(status) };
      });
      return next;
    });
  };

  return (
    <SuiteShell
      eyebrow="Payroll Module"
      title="Payroll, Payroll Tax, and Salary Payment"
      brandEyebrow="Payroll Suite"
      actions={
        <div className="row-actions">
          <button className="ghost-button notification-action" type="button">
            Alerts {summary.notifications.length}
          </button>
          <button
            className="primary-button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await releasePayrollAction();
                setReleaseSummary(result);
                updatePaymentStatus(paymentRows.map((row) => row.id), "Released");
                await refreshPayrollSummary();
              })
            }
            type="button"
          >
            {isPending ? "Releasing..." : "Release Payroll"}
          </button>
        </div>
      }
    >
      <PayrollOverview summary={summary} />
      <EmployeeCtcBreakdownPanel />

      {releaseSummary ? (
        <section className="page-section panel">
          <div className="signal-row">
            <span className="teal">
              {releaseSummary.sent} salary email{releaseSummary.sent === 1 ? "" : "s"} sent
            </span>
            <span>{releaseSummary.eligible} eligible employees</span>
            <span>{releaseSummary.periodLabel}</span>
          </div>
        </section>
      ) : null}

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Salary Payment Queue</p>
              <h3>Employee payroll release control</h3>
            </div>
          </div>
          <div className="table-toolbar">
            <FilterChips
              options={["All", "Ready", "Review", "Hold", "Released"]}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
            <input
              className="search-input"
              placeholder="Search employee, ID, bank, or department"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <button
              className="mini-button"
              disabled={selectedIds.length === 0}
              onClick={() => updatePaymentStatus(selectedIds, "Ready")}
              type="button"
            >
              Validate Selected ({selectedIds.length})
            </button>
            <button
              className="mini-button danger-button"
              disabled={selectedIds.length === 0}
              onClick={() => updatePaymentStatus(selectedIds, "Hold")}
              type="button"
            >
              Hold Selected
            </button>
            {lastUpdated ? <span className="pagination-note">Live sync {lastUpdated}</span> : null}
          </div>
          <table className="data-table payroll-payment-table">
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Select visible salary payments"
                    checked={pagedIds.length > 0 && pagedIds.every((id) => selectedIds.includes(id))}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? Array.from(new Set([...current, ...pagedIds]))
                          : current.filter((id) => !pagedIds.includes(id))
                      )
                    }
                    type="checkbox"
                  />
                </th>
                <th><button className="table-sort" onClick={() => toggleSort("employee")} type="button">Employee</button></th>
                <th><button className="table-sort" onClick={() => toggleSort("department")} type="button">Department</button></th>
                <th><button className="table-sort" onClick={() => toggleSort("netPay")} type="button">Net Pay</button></th>
                <th><button className="table-sort" onClick={() => toggleSort("tax")} type="button">Payroll Tax</button></th>
                <th>Bank Status</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedPayments.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      aria-label={`Select ${row.employee}`}
                      checked={selectedIds.includes(row.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id)
                        )
                      }
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <strong>{row.employee}</strong>
                    <small>{row.employeeId}</small>
                  </td>
                  <td>{row.department}</td>
                  <td>{row.netPay}</td>
                  <td>{row.tax}</td>
                  <td>{row.bankStatus}</td>
                  <td>{row.workflow}</td>
                  <td>
                    <StatusBadge tone={row.tone}>{row.status}</StatusBadge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-button" onClick={() => updatePaymentStatus([row.id], "Ready")} type="button">
                        Validate
                      </button>
                      <button className="mini-button danger-button" onClick={() => updatePaymentStatus([row.id], "Hold")} type="button">
                        Hold
                      </button>
                      <button className="mini-button" onClick={() => updatePaymentStatus([row.id], "Released")} type="button">
                        Release
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination-row">
            <span className="pagination-note">
              Showing {pagedPayments.length} of {visiblePayments.length} salary payments
            </span>
            <div className="row-actions">
              <button
                className="mini-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <span className="page-badge">
                {page} / {totalPages}
              </span>
              <button
                className="mini-button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Payroll Workflow</p>
              <h3>Salary release pipeline</h3>
            </div>
          </div>
          <div className="flow-grid">
            {summary.salaryWorkflow.map((item) => (
              <div className="flow-card" key={item.label}>
                <strong>{item.label}</strong>
                <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section panel chart-filter-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Payroll Analytics</p>
            <h3>Choose reporting window</h3>
          </div>
        </div>
        <FilterChips options={["Monthly", "Quarterly"]} value={range} onChange={setRange} />
      </section>

      <section className="page-section split-grid">
        <BarChart
          eyebrow="Payroll Trend"
          title="Jan to May salary release"
          summary={chartSet.disbursement.summary}
          items={chartSet.disbursement.items}
        />
        <BarChart
          eyebrow="Salary Release Aging"
          title="Payroll queue by status"
          summary={chartSet.aging.summary}
          items={chartSet.aging.items}
        />
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Payroll Tax Split</p>
              <h3>PF, ESI, TDS, and professional tax</h3>
            </div>
          </div>
          <div className="payroll-donut-chart">
            <div
              className="spend-donut"
              style={{
                background: `conic-gradient(var(--teal) 0 ${summary.charts.taxBreakdown[0]?.percent || 0}%, var(--gold) 0 ${
                  (summary.charts.taxBreakdown[0]?.percent || 0) + (summary.charts.taxBreakdown[1]?.percent || 0)
                }%, #c2ccd7 0 100%)`
              }}
            />
            <div className="doc-stack">
              {summary.charts.taxBreakdown.length ? (
                summary.charts.taxBreakdown.map((item) => (
                  <div className="doc-line" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.percent}%</strong>
                  </div>
                ))
              ) : (
                <p className="empty-state">Payroll tax split appears after salary data is available.</p>
              )}
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Download Center</p>
              <h3>Reports and salary payment controls</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Payroll Register</span><strong>Ready</strong></div>
            <div className="doc-line"><span>Tax Working</span><strong>Auto-calculated</strong></div>
            <div className="doc-line"><span>Bank Advice File</span><strong>{releaseSummary ? "Released" : "Queued"}</strong></div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
