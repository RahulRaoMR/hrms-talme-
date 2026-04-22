"use client";

import SuiteShell from "@/components/suite-shell";
import StatusBadge from "@/components/status-badge";

export default function HrmsPageClient({ data }) {
  const employees = data?.employees || [];
  const leaveRequests = data?.leaveRequests || [];
  const attendanceRecords = data?.attendanceRecords || [];
  const documents = data?.documents || [];

  return (
    <SuiteShell
      eyebrow="HRMS Module"
      title="Employee Lifecycle, Attendance, and Performance"
      primaryHref="/payroll"
      primaryLabel="Open Payroll"
      brandEyebrow="HRMS Suite"
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Employee Master</p>
              <h3>Profiles, bank, salary, and lifecycle</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Dept</th>
                <th>Manager</th>
                <th>Bank</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.employeeId}</td>
                  <td>{employee.name}</td>
                  <td>{employee.department}</td>
                  <td>{employee.manager}</td>
                  <td>{employee.bankStatus}</td>
                  <td><StatusBadge tone={employee.tone}>{employee.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Employee Control</p>
              <h3>Profile snapshot</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Total Employees</span><strong>{employees.length}</strong></div>
            <div className="doc-line"><span>Leave Requests</span><strong>{leaveRequests.length}</strong></div>
            <div className="doc-line"><span>Attendance Rows</span><strong>{attendanceRecords.length}</strong></div>
            <div className="doc-line"><span>Document Records</span><strong>{documents.length}</strong></div>
          </div>
        </article>
      </section>

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Attendance &amp; T&amp;A</p>
              <h3>Monthly attendance sheet</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Present</th>
                <th>Leaves</th>
                <th>OT</th>
                <th>Shift</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.employee}</td>
                  <td>{record.present}</td>
                  <td>{record.leaves}</td>
                  <td>{record.overtime}</td>
                  <td>{record.shift}</td>
                  <td><StatusBadge tone={record.tone}>{record.lockState}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Leave Management</p>
              <h3>Balances and approvals</h3>
            </div>
          </div>
          <div className="card-stack">
            {leaveRequests.map((leave) => (
              <div className="process-card" key={leave.id}>
                <strong>{leave.employee}</strong>
                <small>{leave.leaveType} - {leave.dates} - {leave.balance}</small>
                <StatusBadge tone={leave.tone}>{leave.status}</StatusBadge>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Payroll Generator</p>
              <h3>Attendance to salary flow</h3>
            </div>
          </div>
          <div className="score-grid">
            <div className="score-card"><strong>1</strong><small>Lock attendance</small></div>
            <div className="score-card"><strong>2</strong><small>Apply leave and OT</small></div>
            <div className="score-card"><strong>3</strong><small>Generate salary sheet</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Document Vault</p>
              <h3>Employee compliance</h3>
            </div>
          </div>
          <div className="doc-stack">
            {documents.filter((document) => document.module === "Employee").map((document) => (
              <div className="doc-line" key={document.id}>
                <span>{document.owner} - {document.docType}</span>
                <strong>{document.status}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
