"use client";

import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

export default function EmployeePortalPageClient({ data }) {
  const employee = data.employees[0];
  const attendance = data.attendanceRecords.find((record) => record.employee === employee?.name);

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
            <div className="doc-line"><span>Employee ID</span><strong>{employee?.employeeId}</strong></div>
            <div className="doc-line"><span>Email</span><strong>{employee?.email || "Not added"}</strong></div>
            <div className="doc-line"><span>Department</span><strong>{employee?.department}</strong></div>
            <div className="doc-line"><span>Manager</span><strong>{employee?.manager}</strong></div>
            <div className="doc-line"><span>Bank</span><strong>{employee?.bankStatus}</strong></div>
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
            <div className="score-card"><strong>{employee?.salaryBand}</strong><small>Annual band</small></div>
            <div className="score-card"><strong>{attendance?.present || 0}</strong><small>Present days</small></div>
            <div className="score-card"><strong>{attendance?.overtime || 0}</strong><small>OT hours</small></div>
          </div>
          <div className="landing-actions">
            <a
              className="primary-button"
              href={`/api/pdf/payslip?employee=${encodeURIComponent(employee?.name || "Employee")}&month=April%202026&band=${encodeURIComponent(employee?.salaryBand || "INR 0")}`}
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
            {data.leaveRequests.map((leave) => (
              <div className="process-card" key={leave.id}>
                <strong>{leave.leaveType}</strong>
                <small>{leave.employee} - {leave.dates} - {leave.balance}</small>
                <StatusBadge tone={leave.tone}>{leave.status}</StatusBadge>
              </div>
            ))}
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
            {data.documents.map((document) => (
              <div className="doc-line" key={document.id}>
                <span>{document.docType}</span>
                <strong>{document.status}</strong>
              </div>
            ))}
          </div>
          <div className="doc-stack">
            {data.assets?.map((asset) => (
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
