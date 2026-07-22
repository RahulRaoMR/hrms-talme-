"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { getSuiteSession } from "@/lib/auth-session";
import { resolveRole } from "@/lib/permissions";

const storageKey = "talme-weekly-timesheets";

const taskOptions = ["Development", "Recruitment Support", "Client Meeting", "Documentation", "Testing", "Payroll Review"];
const projectOptions = ["HRMS Platform", "Payroll Module", "ATS Pipeline", "Vendor Finance", "Internal Operations"];
const platformOptions = ["Web App", "Mobile App", "Admin Portal", "Backend API", "Client System"];

function startOfWeek(date) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function formatDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function inputDate(date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(start) {
  return inputDate(start);
}

function buildWeeks() {
  const current = startOfWeek(new Date());

  return Array.from({ length: 5 }, (_, index) => {
    const start = addDays(current, index * -7);
    const end = addDays(start, 6);

    return {
      key: weekKey(start),
      label: index === 0 ? "Current Week" : index === 1 ? "Previous Week" : `${formatDate(start)} - ${formatDate(end)}`,
      range: `${formatDate(start)} - ${formatDate(end)}`,
      start,
      end
    };
  });
}

function loadTimesheets() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
}

function userKeys(user = {}) {
  return [
    user.email,
    user.employeeId,
    user.id,
    user.name,
    user.employeeName
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
}

function entryKeys(entry = {}) {
  return [
    entry.ownerKey,
    entry.submittedByEmail,
    entry.userEmail,
    entry.email,
    entry.employeeId,
    entry.submittedBy
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
}

function entryBelongsToUser(entry, user) {
  const currentUserKeys = userKeys(user);
  if (!currentUserKeys.length) return false;

  return entryKeys(entry).some((key) => currentUserKeys.includes(key));
}

function entryMatchesSubmission(entry, submission) {
  return entry.weekKey === submission.weekKey && entryKeys(entry).some((key) => entryKeys(submission).includes(key));
}

function emptyForm(week) {
  return {
    date: inputDate(week.start),
    task: "",
    project: "",
    platform: "",
    hours: "",
    quantity: "NA",
    remark: ""
  };
}

function groupSubmissions(entries) {
  return Object.values(
    entries.reduce((groups, entry) => {
      const owner = entry.ownerKey || entry.submittedByEmail || entry.employeeId || entry.submittedBy || "employee";
      const key = `${owner}:${entry.weekKey}`;

      if (!groups[key]) {
        groups[key] = {
          id: key,
          weekKey: entry.weekKey,
          weekRange: entry.weekRange,
          submittedBy: entry.submittedBy || entry.employeeName || entry.employeeId || "Employee",
          submittedByEmail: entry.submittedByEmail || entry.email || "",
          employeeId: entry.employeeId || "",
          adminViewedAt: entry.adminViewedAt || "",
          reviewedBy: entry.reviewedBy || "",
          reviewedAt: entry.reviewedAt || "",
          status: entry.status || "Draft",
          entries: [],
          hours: 0
        };
      }

      groups[key].entries.push(entry);
      groups[key].hours += Number(entry.hours) || 0;
      if (entry.status && entry.status !== "Draft") {
        groups[key].status = entry.status;
      }
      if (entry.adminViewedAt) {
        groups[key].adminViewedAt = entry.adminViewedAt;
      }
      if (entry.reviewedBy) {
        groups[key].reviewedBy = entry.reviewedBy;
      }
      if (entry.reviewedAt) {
        groups[key].reviewedAt = entry.reviewedAt;
      }

      return groups;
    }, {})
  ).sort((a, b) => String(b.weekKey).localeCompare(String(a.weekKey)));
}

function isPendingSubmission(submission) {
  return ["submitted", "pending approval"].includes(String(submission.status || "").toLowerCase());
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("approved")) return "teal";
  if (normalized.includes("reject")) return "slate";
  if (normalized.includes("submitted") || normalized.includes("pending")) return "gold";
  return "slate";
}

export default function TimesheetPageClient() {
  const weeks = useMemo(() => buildWeeks(), []);
  const [activeTab, setActiveTab] = useState("fill");
  const [session, setSession] = useState(null);
  const [selectedWeekKey, setSelectedWeekKey] = useState(weeks[0].key);
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [adminFilter, setAdminFilter] = useState("pending");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const selectedWeek = weeks.find((week) => week.key === selectedWeekKey) || weeks[0];
  const [form, setForm] = useState(() => emptyForm(selectedWeek));
  const role = resolveRole(session?.user?.role || "") || "";
  const isAdmin = role === "Enterprise Admin";
  const currentUser = session?.user || {};
  const currentUserKey = userKeys(currentUser)[0] || "unknown-user";

  useEffect(() => {
    const nextSession = getSuiteSession();
    const nextRole = resolveRole(nextSession?.user?.role || "") || "";

    setSession(nextSession);
    setActiveTab((current) => {
      if (nextRole === "Enterprise Admin") return "approval";
      return current === "approval" ? "fill" : current;
    });
    setEntries(loadTimesheets());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, loaded]);

  useEffect(() => {
    setForm(emptyForm(selectedWeek));
  }, [selectedWeek]);

  const ownEntries = entries.filter((entry) => entryBelongsToUser(entry, currentUser));
  const weekEntries = ownEntries.filter((entry) => entry.weekKey === selectedWeek.key);
  const submissions = groupSubmissions(ownEntries);
  const adminSubmissions = groupSubmissions(entries);
  const pendingSubmissions = adminSubmissions.filter(isPendingSubmission);
  const viewedSubmissions = adminSubmissions.filter((submission) => submission.adminViewedAt);
  const rejectedSubmissions = adminSubmissions.filter((submission) =>
    String(submission.status || "").toLowerCase().includes("reject")
  );
  const visibleAdminSubmissions = adminSubmissions.filter((submission) => {
    if (adminFilter === "pending") return isPendingSubmission(submission);
    if (adminFilter === "viewed") return Boolean(submission.adminViewedAt);
    if (adminFilter === "rejected") return String(submission.status || "").toLowerCase().includes("reject");
    return true;
  });
  const selectedSubmission = adminSubmissions.find((submission) => submission.id === selectedSubmissionId) || null;
  const weekHours = weekEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
  const weekStatus = weekEntries.find((entry) => entry.status !== "Draft")?.status || "Draft";

  function saveEntry() {
    const nextEntry = {
      id: `timesheet-${Date.now()}`,
      weekKey: selectedWeek.key,
      weekRange: selectedWeek.range,
      status: "Draft",
      ownerKey: currentUserKey,
      submittedByEmail: currentUser.email || "",
      submittedBy: currentUser.name || currentUser.employeeName || currentUser.email || currentUser.employeeId || "Employee",
      employeeId: currentUser.employeeId || "",
      ...form
    };

    setEntries((current) => [nextEntry, ...current]);
    setModalOpen(false);
  }

  function updateWeekStatus(status) {
    setEntries((current) =>
      current.map((entry) =>
        entry.weekKey === selectedWeek.key && entryBelongsToUser(entry, currentUser)
          ? {
              ...entry,
              status,
              submittedAt: new Date().toISOString()
            }
          : entry
      )
    );
  }

  function updateSubmissionStatus(submission, status) {
    setEntries((current) =>
      current.map((entry) =>
        entryMatchesSubmission(entry, submission)
          ? {
              ...entry,
              status,
              reviewedBy: currentUser.name || currentUser.email || "Admin",
              reviewedAt: new Date().toISOString()
            }
          : entry
      )
    );
  }

  function viewSubmission(submission) {
    const viewedAt = new Date().toISOString();
    setSelectedSubmissionId(submission.id);
    setEntries((current) =>
      current.map((entry) =>
        entryMatchesSubmission(entry, submission)
          ? {
              ...entry,
              adminViewedAt: entry.adminViewedAt || viewedAt,
              adminViewedBy: entry.adminViewedBy || currentUser.name || currentUser.email || "Admin"
            }
          : entry
      )
    );
  }

  return (
    <SuiteShell eyebrow="Weekly Time Sheet" title="Timesheets" brandEyebrow="Time Suite">
      <section className="page-section panel timesheet-shell">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Time Tracking</p>
            <h3>Track time, view submissions, and manage approvals</h3>
          </div>
        </div>

        <div className="timesheet-tabs">
          {isAdmin ? (
            <>
              <button className={adminFilter === "pending" ? "active" : ""} onClick={() => setAdminFilter("pending")} type="button">
                Pending ({pendingSubmissions.length})
              </button>
              <button className={adminFilter === "viewed" ? "active" : ""} onClick={() => setAdminFilter("viewed")} type="button">
                Viewed ({viewedSubmissions.length})
              </button>
              <button className={adminFilter === "rejected" ? "active" : ""} onClick={() => setAdminFilter("rejected")} type="button">
                Rejected ({rejectedSubmissions.length})
              </button>
              <button className={adminFilter === "all" ? "active" : ""} onClick={() => setAdminFilter("all")} type="button">
                All ({adminSubmissions.length})
              </button>
            </>
          ) : (
            <>
              <button className={activeTab === "fill" ? "active" : ""} onClick={() => setActiveTab("fill")} type="button">
                Fill Timesheet
              </button>
              <button className={activeTab === "submissions" ? "active" : ""} onClick={() => setActiveTab("submissions")} type="button">
                View Submissions
              </button>
            </>
          )}
        </div>
      </section>

      {activeTab === "fill" && !isAdmin ? (
        <section className="page-section panel timesheet-workspace">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Fill Timesheet</p>
              <h3>Manually add your timesheet entries for current week</h3>
            </div>
            <button className="primary-button" onClick={() => setModalOpen(true)} type="button">
              Add Entry
            </button>
          </div>

          <div className="timesheet-weekbar">
            <label>
              <span>Week</span>
              <select value={selectedWeekKey} onChange={(event) => setSelectedWeekKey(event.target.value)}>
                {weeks.map((week) => (
                  <option key={week.key} value={week.key}>
                    {week.label} - {week.range}
                  </option>
                ))}
              </select>
            </label>
            <div className="timesheet-weekmeta">
              <div>
                <span>Week Range</span>
                <strong>{selectedWeek.range}</strong>
              </div>
              <div>
                <span>Status</span>
                <StatusBadge tone={statusTone(weekStatus)}>{weekStatus}</StatusBadge>
              </div>
              <div>
                <span>Total Hours</span>
                <strong>{weekHours}</strong>
              </div>
            </div>
          </div>

          {weekEntries.length ? (
            <>
              <table className="data-table timesheet-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Platform</th>
                    <th>Hours</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {weekEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>{entry.task}</td>
                      <td>{entry.project}</td>
                      <td>{entry.platform}</td>
                      <td>{entry.hours}</td>
                      <td>{entry.remark || "NA"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="timesheet-actions">
                <button className="primary-button" onClick={() => updateWeekStatus("Submitted")} type="button">
                  Submit Week
                </button>
              </div>
            </>
          ) : (
            <div className="timesheet-empty">
              <div className="empty-icon">Clock</div>
              <strong>No entries for current week</strong>
              <small>Click Add Entry to create your first timesheet entry</small>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "submissions" && !isAdmin ? (
        <section className="page-section panel timesheet-workspace">
          <div className="timesheet-subtabs">
            <button className="active" type="button">My Submissions</button>
            {isAdmin ? <button type="button">Team Submissions</button> : null}
            <button className="ghost-button" type="button">Filter</button>
          </div>
          <p className="session-note">All submissions - {submissions.length} entries</p>

          {submissions.length ? (
            <div className="card-stack">
              {submissions.map((submission) => (
                <div className="process-card timesheet-submission-card" key={submission.id}>
                  <strong>{submission.weekRange}</strong>
                  <small>{submission.entries.length} entries - {submission.hours} hours</small>
                  <StatusBadge tone={statusTone(submission.status)}>{submission.status}</StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <div className="timesheet-empty">
              <div className="empty-icon">Calendar</div>
              <strong>No submissions found</strong>
              <small>Go to Fill Timesheet tab to create your first entry</small>
            </div>
          )}
        </section>
      ) : null}

      {isAdmin ? (
        <section className="page-section panel timesheet-workspace">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Admin Review</p>
              <h3>Approve/Reject Weekly Time Sheet</h3>
              <small>{visibleAdminSubmissions.length} submissions shown</small>
            </div>
          </div>
          {visibleAdminSubmissions.length ? (
            <div className="card-stack">
              {visibleAdminSubmissions.map((submission) => (
                <div
                  className={`process-card timesheet-submission-card timesheet-review-card ${selectedSubmissionId === submission.id ? "active" : ""}`}
                  key={submission.id}
                  onClick={() => viewSubmission(submission)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      viewSubmission(submission);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <strong>{submission.weekRange}</strong>
                  <small>{submission.submittedBy} - {submission.entries.length} entries - {submission.hours} hours</small>
                  <small>{submission.adminViewedAt ? "Viewed" : "Not viewed"}</small>
                  <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                    <StatusBadge tone={statusTone(submission.status)}>{submission.status}</StatusBadge>
                    <button className="mini-button" onClick={() => updateSubmissionStatus(submission, "Approved")} type="button">
                      Approve
                    </button>
                    <button className="mini-button danger-button" onClick={() => updateSubmissionStatus(submission, "Rejected")} type="button">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="timesheet-empty success">
              <div className="empty-icon">Done</div>
              <strong>No submissions found</strong>
              <small>No timesheets match the selected admin filter.</small>
            </div>
          )}

          {selectedSubmission ? (
            <div className="timesheet-detail-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Submitted Information</p>
                  <h3>{selectedSubmission.submittedBy}</h3>
                  <small>{selectedSubmission.weekRange} - {selectedSubmission.entries.length} entries - {selectedSubmission.hours} hours</small>
                </div>
                <StatusBadge tone={statusTone(selectedSubmission.status)}>{selectedSubmission.status}</StatusBadge>
              </div>
              <div className="timesheet-weekmeta">
                <div>
                  <span>Employee ID</span>
                  <strong>{selectedSubmission.employeeId || "Not added"}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{selectedSubmission.submittedByEmail || "Not added"}</strong>
                </div>
                <div>
                  <span>Viewed</span>
                  <strong>{selectedSubmission.adminViewedAt ? new Date(selectedSubmission.adminViewedAt).toLocaleString("en-IN") : "No"}</strong>
                </div>
              </div>
              <table className="data-table timesheet-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Platform</th>
                    <th>Hours</th>
                    <th>Quantity</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSubmission.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>{entry.task}</td>
                      <td>{entry.project}</td>
                      <td>{entry.platform}</td>
                      <td>{entry.hours}</td>
                      <td>{entry.quantity || "NA"}</td>
                      <td>{entry.remark || "NA"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="timesheet-actions">
                <button className="primary-button" onClick={() => updateSubmissionStatus(selectedSubmission, "Approved")} type="button">
                  Approve
                </button>
                <button className="ghost-button danger-button" onClick={() => updateSubmissionStatus(selectedSubmission, "Rejected")} type="button">
                  Reject
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <TimesheetEntryModal
        form={form}
        onClose={() => setModalOpen(false)}
        onSave={saveEntry}
        open={modalOpen}
        setForm={setForm}
      />
    </SuiteShell>
  );
}

function TimesheetEntryModal({ form, onClose, onSave, open, setForm }) {
  const update = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  return (
    <Modal open={open} title="Add New Entry" eyebrow="Weekly Timesheet" onClose={onClose}>
      <div className="form-grid">
        <label>
          <span>Date</span>
          <input type="date" value={form.date} onChange={update("date")} />
        </label>
        <label>
          <span>Task</span>
          <select value={form.task} onChange={update("task")}>
            <option value="">Select Task</option>
            {taskOptions.map((task) => (
              <option key={task}>{task}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Project</span>
          <select value={form.project} onChange={update("project")}>
            <option value="">Select Project</option>
            {projectOptions.map((project) => (
              <option key={project}>{project}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Platform</span>
          <select value={form.platform} onChange={update("platform")}>
            <option value="">Select Platform</option>
            {platformOptions.map((platform) => (
              <option key={platform}>{platform}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Hours Spent</span>
          <input min="0" step="0.25" type="number" value={form.hours} onChange={update("hours")} />
        </label>
        <label>
          <span>Quantity</span>
          <input value={form.quantity} onChange={update("quantity")} />
        </label>
      </div>
      <label className="timesheet-remark">
        <span>Remark</span>
        <textarea placeholder="Optional notes or comments..." value={form.remark} onChange={update("remark")} />
      </label>
      <div className="modal-actions">
        <button className="ghost-button" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="primary-button" disabled={!form.task || !form.project || !form.platform || !form.hours} onClick={onSave} type="button">
          Save Entry
        </button>
      </div>
    </Modal>
  );
}
