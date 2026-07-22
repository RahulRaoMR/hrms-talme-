"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { apiUrl } from "@/lib/api-client";
import { getSuiteSession } from "@/lib/auth-session";

export default function EmployeePortalPageClient({ data }) {
  const [session, setSession] = useState(null);
  const [storedEmployeeId, setStoredEmployeeId] = useState("");
  const sessionEmployeeId = session?.user?.employeeId || storedEmployeeId;
  const employee = useMemo(
    () => findLoggedInEmployee(data.employees || [], session?.user, sessionEmployeeId),
    [data.employees, session?.user, sessionEmployeeId]
  );
  const attendance = useMemo(
    () => (data.attendanceRecords || []).find((record) => isEmployeeRecord(record?.employee, employee)) || {},
    [data.attendanceRecords, employee]
  );
  const leaveRequests = useMemo(
    () => (data.leaveRequests || []).filter((leave) => isEmployeeRecord(leave?.employee, employee)),
    [data.leaveRequests, employee]
  );
  const documents = useMemo(
    () => (data.documents || []).filter((document) => isEmployeeRecord(document?.owner, employee) && document.module === "Employee"),
    [data.documents, employee]
  );
  const assets = useMemo(
    () => (data.assets || []).filter((asset) => isEmployeeRecord(asset?.owner, employee) && asset.module === "Employee"),
    [data.assets, employee]
  );
  const payslip = useMemo(
    () => (data.payslips || []).find((record) => isEmployeeRecord(record?.employee || record?.name || record?.employeeId, employee)) || {},
    [data.payslips, employee]
  );
  const salaryBand = employee?.salaryBand || (payslip.monthlyCtc ? `Monthly - INR ${payslip.monthlyCtc}` : "Not added");
  const presentDays = attendance?.present ?? attendance?.presentDays ?? payslip?.presentDays ?? 0;
  const otHours = attendance?.overtime ?? attendance?.otHours ?? payslip?.otHours ?? 0;

  useEffect(() => {
    setSession(getSuiteSession());
    setStoredEmployeeId(window.sessionStorage.getItem("talme-employee-app-employee-id") || "");
  }, []);

  return (
    <SuiteShell
      eyebrow="Employee Self-Service"
      title="Payslips, Leave, Attendance, and Profile Updates"
      primaryHref="/vendor-portal"
      primaryLabel="Vendor Portal"
      brandEyebrow="Self-Service Suite"
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">My Profile</p>
              <h3>{employee?.name || "Employee"}</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Employee ID</span><strong>{displayValue(employee?.employeeId)}</strong></div>
            <div className="doc-line"><span>Email</span><strong>{displayValue(employee?.email)}</strong></div>
            <div className="doc-line"><span>Department</span><strong>{displayValue(employee?.department)}</strong></div>
            <div className="doc-line"><span>Manager</span><strong>{displayValue(employee?.manager)}</strong></div>
            <div className="doc-line"><span>Bank</span><strong>{displayValue(employee?.bankStatus)}</strong></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Payslip Download</p>
              <h3>April salary pack</h3>
            </div>
          </div>
          <div className="score-grid">
            <div className="score-card"><strong>{salaryBand}</strong><small>Annual band</small></div>
            <div className="score-card"><strong>{presentDays}</strong><small>Present days</small></div>
            <div className="score-card"><strong>{otHours}</strong><small>OT hours</small></div>
          </div>
          <div className="landing-actions">
            <a
              className="primary-button"
              href={apiUrl(`/api/pdf/payslip?employee=${encodeURIComponent(employee?.name || "Employee")}&employeeId=${encodeURIComponent(employee?.employeeId || "")}&month=April%202026&band=${encodeURIComponent(salaryBand || "INR 0")}`)}
              target="_blank"
              rel="noreferrer"
            >
              Download Payslip PDF
            </a>
          </div>
        </article>
      </section>

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Leave Requests</p>
              <h3>Balance and approvals</h3>
            </div>
          </div>
          <div className="card-stack">
            {leaveRequests.length ? leaveRequests.map((leave) => (
              <div className="process-card" key={leave.id}>
                <strong>{leave.leaveType}</strong>
                <small>{leave.employee} - {leave.dates} - {leave.balance}</small>
                <StatusBadge tone={leave.tone}>{leave.status}</StatusBadge>
              </div>
            )) : <p className="muted-copy">No leave requests found for this employee.</p>}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">My Documents</p>
              <h3>Download center</h3>
            </div>
          </div>
          <div className="doc-stack">
            {documents.length ? documents.map((document) => (
              <div className="doc-line" key={document.id}>
                <span>{document.docType}</span>
                <strong>{document.status}</strong>
              </div>
            )) : <div className="doc-line"><span>Employee documents</span><strong>Not added</strong></div>}
          </div>
          <div className="doc-stack">
            {assets.map((asset) => (
              <div className="doc-line" key={asset.id}>
                <span>{asset.label}</span>
                <a href={asset.fileUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            ))}
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function displayValue(value) {
  const text = String(value || "").trim();
  return text || "Not added";
}

function isEmployeeRecord(value, employee) {
  const lookup = normalize(value);
  if (!lookup) return false;

  return [
    employee?.name,
    employee?.employeeId,
    employee?.email,
    employee?.id
  ].some((candidate) => normalize(candidate) === lookup);
}

function findLoggedInEmployee(employees, user, sessionEmployeeId) {
  const employeeId = normalize(sessionEmployeeId || user?.employeeId);
  const email = normalize(user?.email);
  const matchedEmployee =
    employees.find((employee) => employeeId && normalize(employee.employeeId || employee.id) === employeeId) ||
    employees.find((employee) => email && normalize(employee.email) === email);

  if (matchedEmployee) return matchedEmployee;

  if (employeeId || user?.name || user?.email) {
    return {
      id: employeeId || user?.id,
      employeeId: sessionEmployeeId || user?.employeeId || "",
      name: user?.name || "Employee",
      email: user?.email || "",
      department: user?.department || "",
      manager: user?.manager || "",
      salaryBand: "",
      bankStatus: ""
    };
  }

  return employees[0] || {};
}
