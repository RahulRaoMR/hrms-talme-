"use client";

import { useEffect, useMemo, useState } from "react";
import SuiteShell from "@/components/suite-shell";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const parameters = [
  { key: "bugs", label: "Bug Identification & Analysis", weight: "30%", color: "#2563eb" },
  { key: "reports", label: "Report Writing & Documentation", weight: "20%", color: "#dc2626" },
  { key: "communication", label: "Communication & Collaboration", weight: "20%", color: "#16a34a" },
  { key: "duties", label: "Duties & Responsibilities Performance", weight: "20%", color: "#7c3aed" },
  { key: "upskilling", label: "Upskilling & Contribution", weight: "10%", color: "#ea580c" }
];
const parameterWeights = { bugs: 0.3, reports: 0.2, communication: 0.2, duties: 0.2, upskilling: 0.1 };
const scoreOptions = ["0", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];
const defaultRatingValues = { bugs: "0", reports: "0", communication: "0", duties: "0", upskilling: "0" };
const ratingStorageKey = "talme-performance-ratings";
const currentDate = new Date();
const currentMonth = months[currentDate.getMonth()];
const currentYear = String(currentDate.getFullYear());
const yearOptions = [currentYear, String(currentDate.getFullYear() - 1)];

const seedRatings = [
  {
    month: "March 2026",
    period: "Mar 2026",
    reviewer: "Sushil Pandit",
    employee: "Abhay Kumar Mishra",
    email: "abhay@saralx.com",
    designation: "EMPLOYEE",
    department: "Testing",
    values: { bugs: 4, reports: 4, communication: 3, duties: 3, upskilling: 3 },
    overall: 3.5,
    zScore: "+0.89a",
    rank: "P88",
    trend: "Improving",
    template: "Audit Employee Dec 2025",
    status: "Submitted"
  },
  {
    month: "February 2026",
    period: "Feb 2026",
    reviewer: "Sushil Pandit",
    employee: "Abhay Kumar Mishra",
    email: "abhay@saralx.com",
    designation: "EMPLOYEE",
    department: "Testing",
    values: { bugs: 4, reports: 4, communication: 3, duties: 3, upskilling: 3 },
    overall: 3.5,
    zScore: "+0.89a",
    rank: "P88",
    trend: "Improving",
    template: "Audit Employee Dec 2025",
    status: "Submitted"
  },
  {
    month: "January 2026",
    period: "Jan 2026",
    reviewer: "Sushil Pandit",
    employee: "Abhay Kumar Mishra",
    email: "abhay@saralx.com",
    designation: "EMPLOYEE",
    department: "Testing",
    values: { bugs: 3, reports: 3, communication: 2, duties: 3, upskilling: 2 },
    overall: 2.6,
    zScore: "+0.21a",
    rank: "P73",
    trend: "Improving",
    template: "Audit Employee Dec 2025",
    status: "Submitted"
  },
  {
    month: "December 2025",
    period: "Dec 2025",
    reviewer: "Sushil Pandit",
    employee: "Abhay Kumar Mishra",
    email: "abhay@saralx.com",
    designation: "EMPLOYEE",
    department: "Testing",
    values: { bugs: 4, reports: 3, communication: 4, duties: 4, upskilling: 2 },
    overall: 3.3,
    zScore: "+0.62a",
    rank: "P81",
    trend: "Stable",
    template: "Audit Employee Dec 2025",
    status: "Submitted"
  }
];

function averageScore(rows) {
  if (!rows.length) return "-";
  return (rows.reduce((total, row) => total + row.overall, 0) / rows.length).toFixed(2);
}

function getEmployeeDetailValue(employee, key) {
  const details = employee?.employeeDetails || {};

  if (!details || typeof details !== "object") return "";

  return details[key] || "";
}

function employeeInitials(name) {
  const words = String(name || "Employee")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return `${words[0]?.[0] || "E"}${words[1]?.[0] || ""}`.toUpperCase();
}

function normalizeEmployeeName(name) {
  return String(name || "").trim().toLowerCase();
}

function mapRegisteredEmployee(employee) {
  return {
    id: employee.id || employee.employeeId || employee.name,
    name: String(employee.name || employee.employeeName || employee.displayName || "").trim(),
    email: employee.email || "",
    designation: employee.grade || getEmployeeDetailValue(employee, "designation") || "Employee",
    department: employee.department || getEmployeeDetailValue(employee, "department") || "-",
    employeeId: employee.employeeId || ""
  };
}

function buildEmployeeOptions(employees, ratingRows = seedRatings) {
  const options = [];
  const seen = new Set();

  function addEmployee(employee) {
    const normalized = normalizeEmployeeName(employee.name);

    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    options.push(employee);
  }

  employees.map(mapRegisteredEmployee).forEach(addEmployee);
  ratingRows.forEach((row) =>
    addEmployee({
      id: row.employee,
      name: row.employee,
      email: row.email,
      designation: row.designation,
      department: row.department,
      employeeId: ""
    })
  );

  return options;
}

function calculateOverall(values) {
  const score = parameters.reduce(
    (total, parameter) => total + (Number(values[parameter.key]) || 0) * parameterWeights[parameter.key],
    0
  );

  return Number(score.toFixed(2));
}

function periodFromMonthYear(monthName, year) {
  return `${String(monthName || "").slice(0, 3)} ${year}`;
}

function trendFromScore(score) {
  if (score >= 4) return "Strong";
  if (score >= 3) return "Improving";
  return "Needs Focus";
}

function rankFromScore(score) {
  return `P${Math.max(1, Math.min(99, Math.round((score / 5) * 100)))}`;
}

function zScoreFromScore(score) {
  const zScore = ((score - 3) * 0.6).toFixed(2);
  return `${Number(zScore) >= 0 ? "+" : ""}${zScore}`;
}

function emptyValues() {
  return Object.fromEntries(parameters.map((item) => [item.key, 0]));
}

function createEmptyRatingRow({ employeeName, employee, monthName, year }) {
  const ratingMonth = `${monthName} ${year}`;

  return {
    month: ratingMonth,
    period: periodFromMonthYear(monthName, year),
    reviewer: "-",
    employee: employeeName,
    email: employee?.email || "",
    designation: employee?.designation || "-",
    department: employee?.department || "-",
    values: emptyValues(),
    overall: 0,
    zScore: "-",
    rank: "-",
    trend: "-",
    template: "Audit Employee Dec 2025",
    status: "Not Rated",
    placeholder: true
  };
}

function ScoreCard({ tone, icon, label, value, suffix }) {
  return (
    <article className="performance-stat-card">
      <span className={`performance-stat-icon ${tone}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}<em>{suffix}</em></strong>
      </div>
    </article>
  );
}

function RatingsTable({ rows, compact = false }) {
  return (
    <div className="performance-table-wrap">
      <table className="performance-table">
        <thead>
          <tr>
            {compact ? <th>Employee</th> : <th>Month</th>}
            {compact ? <th>Period</th> : parameters.map((parameter) => (
              <th key={parameter.key}>{parameter.label.slice(0, 12)}<small>({parameter.weight})</small></th>
            ))}
            {compact ? <th>Score</th> : <th>Overall</th>}
            {compact ? <><th>Z-Score</th><th>Rank</th><th>Trend</th><th>Template</th><th>Status</th></> : <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={`${row.employee}-${row.month}`}>
              {compact ? (
                <td>
                  <span className="performance-avatar small">{employeeInitials(row.employee)}</span>
                  <strong>{row.employee}</strong>
                  <small>{row.email}</small>
                </td>
              ) : (
                <td><strong>{row.month}</strong><small>by {row.reviewer}</small></td>
              )}
              {compact ? (
                <>
                  <td>{row.period}</td>
                  <td><strong className="score-text">{row.overall}</strong></td>
                  <td>{row.zScore}</td>
                  <td>{row.rank}</td>
                  <td><span className="trend-pill">{row.trend}</span></td>
                  <td>{row.template}</td>
                  <td><span className="status-pill">{row.status}</span></td>
                </>
              ) : (
                <>
                  {parameters.map((parameter) => (
                    <td key={parameter.key}>
                      <span className={`rating-chip ${row.values[parameter.key] >= 4 ? "blue" : "gold"}`}>
                        {row.values[parameter.key].toFixed(1)}
                      </span>
                    </td>
                  ))}
                  <td><span className="rating-chip blue">{row.overall.toFixed(2)}</span></td>
                  <td><button className="remarks-button" type="button">Remarks</button></td>
                </>
              )}
            </tr>
          )) : (
            <tr>
              <td colSpan={compact ? 8 : parameters.length + 3}>
                <span className="empty-state">No ratings found for the selected employee and period.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PerformanceChart({ rows, selectedParameter }) {
  const chartRows = [...rows].reverse();
  const width = 860;
  const height = 260;
  const left = 52;
  const top = 18;
  const graphWidth = width - 84;
  const graphHeight = height - 58;
  const series = [
    { key: "overall", label: "Overall Score", color: "#111827" },
    ...parameters.map((parameter) => ({ key: parameter.key, label: parameter.label, color: parameter.color }))
  ].filter((item) => selectedParameter === "all" || item.key === selectedParameter || item.key === "overall");

  function point(row, index, key) {
    const value = key === "overall" ? row.overall : row.values[key];
    const x = left + (chartRows.length === 1 ? 0 : (index / (chartRows.length - 1)) * graphWidth);
    const y = top + (5 - value) / 5 * graphHeight;
    return `${x},${y}`;
  }

  return (
    <div className="performance-chart-shell">
      <svg className="performance-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Performance trend chart">
        {[0, 1, 2, 3, 4, 5].map((tick) => {
          const y = top + (5 - tick) / 5 * graphHeight;
          return (
            <g key={tick}>
              <line x1={left} x2={left + graphWidth} y1={y} y2={y} />
              <text x={left - 12} y={y + 4}>{tick}</text>
            </g>
          );
        })}
        {chartRows.map((row, index) => {
          const x = left + (chartRows.length === 1 ? 0 : (index / (chartRows.length - 1)) * graphWidth);
          return <text key={row.month} x={x - 20} y={height - 22}>{row.period.replace(" ", "/")}</text>;
        })}
        {series.map((item) => (
          <g key={item.key}>
            <polyline
              fill="none"
              stroke={item.color}
              strokeDasharray={item.key === "duties" ? "5 5" : "0"}
              strokeWidth="2.5"
              points={chartRows.map((row, index) => point(row, index, item.key)).join(" ")}
            />
            {chartRows.map((row, index) => {
              const [cx, cy] = point(row, index, item.key).split(",");
              return <circle key={`${item.key}-${row.month}`} cx={cx} cy={cy} r="4" fill={item.color} />;
            })}
          </g>
        ))}
      </svg>
      <div className="performance-legend">
        {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
    </div>
  );
}

export default function PerformanceRatingsPage({ employees = [] }) {
  const [tab, setTab] = useState("view");
  const [viewMode, setViewMode] = useState("ratings");
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [parameter, setParameter] = useState("all");
  const [ratingRows, setRatingRows] = useState(seedRatings);
  const [isRatingStoreReady, setIsRatingStoreReady] = useState(false);
  const employeeOptions = useMemo(() => buildEmployeeOptions(employees, ratingRows), [employees, ratingRows]);
  const firstEmployeeName = employeeOptions[0]?.name || "All Employees";
  const [selectedEmployee, setSelectedEmployee] = useState(firstEmployeeName);
  const [ratingForm, setRatingForm] = useState({
    employee: "",
    month: currentMonth,
    year: currentYear,
    reviewer: "HR Admin",
    values: defaultRatingValues
  });
  const ratingOverall = calculateOverall(ratingForm.values);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ratingStorageKey);
      const parsed = stored ? JSON.parse(stored) : null;

      if (Array.isArray(parsed)) {
        setRatingRows(parsed);
      }
    } catch {
      setRatingRows(seedRatings);
    } finally {
      setIsRatingStoreReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isRatingStoreReady) return;

    window.localStorage.setItem(ratingStorageKey, JSON.stringify(ratingRows));
  }, [isRatingStoreReady, ratingRows]);

  useEffect(() => {
    const selectedStillExists =
      selectedEmployee === "All Employees" ||
      employeeOptions.some((employee) => employee.name === selectedEmployee);

    if (!selectedStillExists) {
      setSelectedEmployee(firstEmployeeName);
    }
  }, [employeeOptions, firstEmployeeName, selectedEmployee]);

  useEffect(() => {
    if (!employeeOptions.length) return;

    const formEmployeeStillExists = employeeOptions.some((employee) => employee.name === ratingForm.employee);

    if (!formEmployeeStillExists) {
      setRatingForm((current) => ({ ...current, employee: employeeOptions[0].name }));
    }
  }, [employeeOptions, ratingForm.employee]);

  const selectedEmployeeRecord =
    selectedEmployee === "All Employees"
      ? null
      : employeeOptions.find((employee) => employee.name === selectedEmployee) || employeeOptions[0] || null;
  const rows = useMemo(
    () =>
      ratingRows.filter((row) => {
        const matchesEmployee = selectedEmployee === "All Employees" || row.employee === selectedEmployee;
        const matchesMonth = month === "All" || row.month.startsWith(month);
        const matchesYear = row.month.endsWith(year);

        return matchesEmployee && matchesMonth && matchesYear;
      }),
    [month, ratingRows, selectedEmployee, year]
  );
  const overviewRows = useMemo(
    () =>
      ratingRows.filter((row) => {
        const matchesEmployee = selectedEmployee === "All Employees" || row.employee === selectedEmployee;
        const matchesYear = row.month.endsWith(year);

        return matchesEmployee && matchesYear;
      }),
    [ratingRows, selectedEmployee, year]
  );
  const tableRows = rows.length ? rows : [];
  const latestRating = overviewRows[0];
  const currentRatingPeriod = `${ratingForm.month} ${ratingForm.year}`;
  const pendingRatings = Math.max(
    0,
    employeeOptions.length - ratingRows.filter((row) => row.month === currentRatingPeriod).length
  );
  const selectedEmployeeLabel =
    selectedEmployee === "All Employees" ? "All Employees" : selectedEmployeeRecord?.name || firstEmployeeName;
  const chartRows = useMemo(() => {
    if (overviewRows.length) return overviewRows;

    return [
      createEmptyRatingRow({
        employeeName: selectedEmployeeLabel,
        employee: selectedEmployeeRecord,
        monthName: month === "All" ? ratingForm.month : month,
        year
      })
    ];
  }, [month, overviewRows, ratingForm.month, selectedEmployeeLabel, selectedEmployeeRecord, year]);

  function updateRatingScore(key, value) {
    setRatingForm((current) => ({
      ...current,
      values: {
        ...current.values,
        [key]: value
      }
    }));
  }

  function submitRating(event) {
    event.preventDefault();

    const employee = employeeOptions.find((item) => item.name === ratingForm.employee);
    if (!employee) return;

    const ratingMonth = `${ratingForm.month} ${ratingForm.year}`;
    const period = periodFromMonthYear(ratingForm.month, ratingForm.year);
    const overall = calculateOverall(ratingForm.values);
    const nextRow = {
      month: ratingMonth,
      period,
      reviewer: ratingForm.reviewer || "HR Admin",
      employee: employee.name,
      email: employee.email,
      designation: employee.designation,
      department: employee.department,
      values: Object.fromEntries(parameters.map((item) => [item.key, Number(ratingForm.values[item.key]) || 0])),
      overall,
      zScore: zScoreFromScore(overall),
      rank: rankFromScore(overall),
      trend: trendFromScore(overall),
      template: "Audit Employee Dec 2025",
      status: "Submitted"
    };

    setRatingRows((current) => [
      nextRow,
      ...current.filter((row) => !(row.employee === nextRow.employee && row.month === nextRow.month))
    ]);
    setSelectedEmployee(employee.name);
    setMonth(ratingForm.month);
    setYear(ratingForm.year);
    setViewMode("ratings");
    setTab("view");
  }

  return (
    <SuiteShell
      eyebrow="Performance"
      title="Performance Ratings"
      brandEyebrow="People Intelligence"
    >
      <section className="performance-page">
        <div className="performance-page-head">
          <div>
            <h2>Performance Ratings</h2>
            <p>Rate team members, view performance history, and manage rating templates</p>
          </div>
        </div>

        <div className="performance-stat-grid">
          <ScoreCard tone="amber" icon="◷" label="Pending Ratings" value={String(pendingRatings)} />
          <ScoreCard tone="blue" icon="▤" label="Templates" value="1" />
          <ScoreCard tone="slate" icon="−" label="Team Trend" value={latestRating?.trend || "-"} />
          <ScoreCard tone="purple" icon="☆" label="Avg Score" value={tableRows.length ? averageScore(tableRows) : "-"} />
        </div>

        <section className="performance-panel">
          <div className="performance-tabs">
            <button className={tab === "view" ? "active" : ""} onClick={() => setTab("view")} type="button">View Ratings</button>
            <button className={tab === "give" ? "active" : ""} onClick={() => setTab("give")} type="button">Give Rating</button>
            <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")} type="button">Templates</button>
          </div>

          {tab === "view" ? (
            <>
              <div className="performance-filters">
                <label>Employee<select value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)}>
                  <option>All Employees</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id || employee.name} value={employee.name}>
                      {employee.name}
                    </option>
                  ))}
                </select></label>
                <label>Month<select value={month} onChange={(event) => setMonth(event.target.value)}>
                  <option>All</option>
                  {months.map((item) => <option key={item}>{item}</option>)}
                </select></label>
                <label>Year<select value={year} onChange={(event) => setYear(event.target.value)}>
                  {yearOptions.map((item) => <option key={item}>{item}</option>)}
                </select></label>
              </div>

              <article className="performance-overview">
                <header className="performance-overview-head">
                  <div>
                    <p>Performance Overview</p>
                    <h3>Detailed performance ratings and trends for {selectedEmployeeLabel}</h3>
                  </div>
                  <div className="performance-view-switch">
                    <button className={viewMode === "chart" ? "active" : ""} onClick={() => setViewMode("chart")} type="button">Performance Chart</button>
                    <button className={viewMode === "ratings" ? "active" : ""} onClick={() => setViewMode("ratings")} type="button">Ratings Table</button>
                  </div>
                </header>

                <div className="performance-stat-grid compact">
                  <ScoreCard tone="amber" icon="♙" label="Cumulative Score" value={averageScore(overviewRows)} suffix={overviewRows.length ? "/5" : ""} />
                  <ScoreCard tone="blue" icon="☆" label="Total Ratings" value={String(overviewRows.length)} />
                  <ScoreCard tone="green" icon="↗" label="Parameters" value="5" />
                  <ScoreCard tone="purple" icon="▣" label="Latest Rating" value={latestRating?.period || "-"} />
                </div>

                {viewMode === "chart" ? (
                  <>
                    <div className="performance-filters single">
                      <label>Filter Parameters<select value={parameter} onChange={(event) => setParameter(event.target.value)}>
                        <option value="all">All Parameters</option>
                        {parameters.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.weight})</option>)}
                      </select></label>
                    </div>
                    <PerformanceChart rows={chartRows} selectedParameter={parameter} />
                    <div className="parameter-weight-box">
                      <strong>Parameter Weights</strong>
                      {parameters.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label} <em>({item.weight})</em></span>)}
                    </div>
                  </>
                ) : (
                  <RatingsTable rows={overviewRows.slice(0, 2)} />
                )}
              </article>
            </>
          ) : null}

          {tab === "give" ? (
            <form className="performance-rating-form" onSubmit={submitRating}>
              <div className="performance-filters rating-entry-filters">
                <label>Employee<select value={ratingForm.employee} onChange={(event) => setRatingForm((current) => ({ ...current, employee: event.target.value }))}>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id || employee.name} value={employee.name}>{employee.name}</option>
                  ))}
                </select></label>
                <label>Month<select value={ratingForm.month} onChange={(event) => setRatingForm((current) => ({ ...current, month: event.target.value }))}>
                  {months.map((item) => <option key={item}>{item}</option>)}
                </select></label>
                <label>Year<select value={ratingForm.year} onChange={(event) => setRatingForm((current) => ({ ...current, year: event.target.value }))}>
                  {yearOptions.map((item) => <option key={item}>{item}</option>)}
                </select></label>
                <label>Reviewer<input value={ratingForm.reviewer} onChange={(event) => setRatingForm((current) => ({ ...current, reviewer: event.target.value }))} /></label>
              </div>

              <div className="rating-entry-grid">
                {parameters.map((item) => (
                  <label key={item.key}>
                    <span>{item.label}<small>{item.weight}</small></span>
                    <select value={ratingForm.values[item.key]} onChange={(event) => updateRatingScore(item.key, event.target.value)}>
                      {scoreOptions.map((score) => <option key={score} value={score}>{score}</option>)}
                    </select>
                  </label>
                ))}
              </div>

              <div className="rating-submit-row">
                <div>
                  <small>Weighted Overall</small>
                  <strong>{ratingOverall.toFixed(2)}<em>/5</em></strong>
                </div>
                <button className="performance-submit-button" disabled={!employeeOptions.length} type="submit">Submit Rating</button>
              </div>
            </form>
          ) : null}

          {tab === "templates" ? (
            <div className="template-section">
              <div className="template-head">
                <h3>Rating Templates</h3>
                <button type="button">+ Create Template</button>
              </div>
              <table className="performance-table">
                <thead><tr><th>Name</th><th>Type</th><th>Department</th><th>Params</th><th>Status</th><th>Effective</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr>
                    <td><strong>Audit Employee Dec 2025</strong> <small>v1</small></td>
                    <td><span className="trend-pill">Employee</span></td>
                    <td>Testing</td>
                    <td>5</td>
                    <td><span className="status-pill green">Active</span></td>
                    <td>Jan 2026<small>135 ratings</small></td>
                    <td>✎  ♡</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>
    </SuiteShell>
  );
}
