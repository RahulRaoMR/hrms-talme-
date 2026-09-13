"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSuiteSession } from "@/lib/auth-session";
import { canReviewPunches } from "@/lib/punch-status";
import StatusBadge from "@/components/status-badge";

export default function PunchRegularizationRequests({ employees, assignments }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewer, setReviewer] = useState(false);
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    const session = getSuiteSession();
    setReviewer(canReviewPunches(session?.user));
    try {
      const response = await fetch("/api/punch-activity/regularizations", {
        cache: "no-store", headers: { Authorization: `Bearer ${session?.token || ""}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load requests.");
      setRows(result);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  async function review(row, nextStatus) {
    if (busy) return;
    setBusy(row.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/punch-activity/${encodeURIComponent(row.id)}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSuiteSession()?.token || ""}` },
        body: JSON.stringify({ status: nextStatus, reason: nextStatus === "Declined" ? reason : "" })
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) await refresh();
        throw new Error(result.error || "Unable to review request.");
      }
      setRows(current => current.map(item => item.id === result.id ? result : item));
      setDeclining(null);
      setReason("");
      setMessage(`Request ${nextStatus.toLowerCase()} for ${row.employeeName || row.employeeId}.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  const visible = rows.filter(row => status === "All" || row.regularizationStatus === status);
  const user = getSuiteSession()?.user;
  return (
    <section className="page-section panel punch-review-section">
      <div className="panel-head">
        <div><p className="eyebrow">Punch Requests</p><h3>Regularization</h3></div>
        <label className="punch-review-filter">Status
          <select value={status} onChange={event => setStatus(event.target.value)}>
            {["Pending", "Accepted", "Declined", "Withdrawn", "All"].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {message ? <p className="session-note" role="status">{message}</p> : null}
      {error ? <p className="punch-review-error" role="alert">{error} <button type="button" onClick={refresh}>Retry</button></p> : null}
      {loading ? <p role="status">Loading requests...</p> : visible.length ? (
        <div className="punch-review-table-scroll">
          <table className="data-table punch-review-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Date</th><th>Shift</th><th>Requested Punch</th><th>Scheduled Start</th><th>Scheduled End</th><th>Break</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{visible.map(row => {
              const employee = employees.find(item => String(item.employeeId || item.id).toLowerCase() === row.employeeId.toLowerCase());
              const shift = assignments[employee?.employeeId || row.employeeId];
              const own = String(user?.employeeId || "").toLowerCase() === row.employeeId.toLowerCase() || (employee?.email && employee.email.toLowerCase() === user?.email?.toLowerCase());
              return <tr key={row.id}>
                <td><strong>{row.employeeName || employee?.name || row.employeeId}</strong><small>{row.employeeId}</small></td>
                <td>{employee?.department || "-"}</td><td>{row.workDate}</td><td>{shift?.shiftName || "General"}</td>
                <td><strong>{row.type}: {row.time}</strong><small>{row.reason || "-"}</small></td>
                <td>{shift?.start || "09:00"}</td><td>{shift?.end || "18:00"}</td><td>{shift?.breakMinutes ?? "60"} min</td>
                <td><StatusBadge tone={row.regularizationStatus === "Accepted" ? "teal" : row.regularizationStatus === "Pending" ? "gold" : "rose"}>{row.regularizationStatus}</StatusBadge>
                  {row.regularizationDeclineReason ? <small>{row.regularizationDeclineReason}</small> : null}
                  {row.regularizationReviewedBy ? <small>{row.regularizationReviewedBy}<br />{new Date(row.regularizationReviewedAt).toLocaleString()}</small> : null}
                </td>
                <td>{row.regularizationStatus === "Pending" && reviewer && !own ? (
                  <div className="punch-review-actions">
                    <button className="primary-button" disabled={Boolean(busy)} type="button" onClick={() => review(row, "Accepted")}>{busy === row.id ? "Saving..." : "Accept"}</button>
                    <button className="secondary-button" disabled={Boolean(busy)} type="button" onClick={() => { setDeclining(row); setReason(""); }}>Decline</button>
                  </div>
                ) : own && row.regularizationStatus === "Pending" ? "Awaiting HR review" : "-"}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : !error ? <p className="empty-state">No {status === "All" ? "" : status.toLowerCase() + " "}regularization requests.</p> : null}
      {declining && typeof document !== "undefined" ? createPortal(<div className="regularization-confirm-layer punch-review-confirm-layer">
        <form className="regularization-confirm-dialog punch-review-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="decline-request-title" onSubmit={event => { event.preventDefault(); review(declining, "Declined"); }}>
          <h2 id="decline-request-title">Decline Request</h2>
          <p>{declining.employeeName || declining.employeeId} | {declining.workDate} | {declining.time}</p>
          <label className="punch-review-decline-reason">Reason (optional)<textarea autoFocus maxLength={1000} placeholder="Add context for the employee" value={reason} onChange={event => setReason(event.target.value)} /></label>
          {error ? <p role="alert" className="punch-review-error">{error}</p> : null}
          <div className="regularization-confirm-actions"><button type="button" disabled={Boolean(busy)} onClick={() => setDeclining(null)}>Cancel</button><button type="submit" disabled={Boolean(busy)}>{busy ? "Saving..." : "Decline"}</button></div>
        </form>
      </div>, document.body) : null}
    </section>
  );
}
