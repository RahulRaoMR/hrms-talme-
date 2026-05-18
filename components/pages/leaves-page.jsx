"use client";

import { useMemo, useState, useTransition } from "react";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import {
  createLeaveRequestAction,
  deleteLeaveRequestAction,
  updateLeaveRequestAction
} from "@/lib/api-actions";

const defaultLeaveForm = {
  employee: "",
  leaveType: "Casual Leave",
  dates: "",
  balance: "12 days available",
  approver: "",
  status: "Review",
  tone: "gold"
};

const leaveTypes = ["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave", "Comp Off", "Work From Home"];
const statusFilters = ["All", "Review", "Leave Accepted", "Rejected"];

function statusTone(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (["accepted", "approved", "leave accepted"].includes(normalized)) return "teal";
  if (normalized.includes("reject")) return "slate";
  return "gold";
}

function isApproved(status) {
  return ["accepted", "approved", "leave accepted"].includes(String(status || "").trim().toLowerCase());
}

function isPending(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized.includes("review") || normalized.includes("pending") || !normalized;
}

function employeeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function parseLeaveDays(dates) {
  const parts = String(dates || "")
    .split(/\s+(?:to|-)\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length < 2) return dates ? 1 : 0;

  const start = new Date(parts[0]);
  const end = new Date(parts[1]);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function buildEmployeeRows(employees, leaveRequests, attendanceRecords) {
  const people = employees.length
    ? employees
    : Array.from(new Set(leaveRequests.map((leave) => leave.employee).filter(Boolean))).map((name, index) => ({
        id: `leave-person-${index + 1}`,
        employeeId: `EMP-${index + 1}`,
        name,
        department: "General",
        manager: "HR"
      }));

  return people.map((employee) => {
    const requests = leaveRequests.filter((leave) => employeeKey(leave.employee) === employeeKey(employee.name));
    const attendance = attendanceRecords.find((record) => employeeKey(record.employee) === employeeKey(employee.name));
    const leaveDays = requests.reduce((total, leave) => total + parseLeaveDays(leave.dates), 0);
    const pendingCount = requests.filter((leave) => isPending(leave.status)).length;
    const latestLeave = requests[0];
    const balance = latestLeave?.balance || `${Math.max(0, 18 - leaveDays)} days available`;

    return {
      ...employee,
      requests,
      leaveDays: leaveDays || Number(attendance?.paidLeaves ?? attendance?.leaves ?? 0) || 0,
      pendingCount,
      balance,
      approver: latestLeave?.approver || employee.manager || "HR",
      latestStatus: latestLeave?.status || "No request",
      latestTone: latestLeave ? statusTone(latestLeave.status) : "slate"
    };
  });
}

function createInitialForm(employees) {
  const firstEmployee = employees[0];

  return {
    ...defaultLeaveForm,
    employee: firstEmployee?.name || "",
    approver: firstEmployee?.manager || "HR"
  };
}

export default function LeavesPageClient({ data }) {
  const employees = useMemo(() => data?.employees || [], [data?.employees]);
  const attendanceRecords = useMemo(() => data?.attendanceRecords || [], [data?.attendanceRecords]);
  const [leaveRequests, setLeaveRequests] = useState(data?.leaveRequests || []);
  const [leaveForm, setLeaveForm] = useState(() => createInitialForm(employees));
  const [leaveEdit, setLeaveEdit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [isPendingTransition, startTransition] = useTransition();

  const employeeRows = useMemo(
    () => buildEmployeeRows(employees, leaveRequests, attendanceRecords),
    [employees, leaveRequests, attendanceRecords]
  );

  const filteredEmployeeRows = employeeRows.filter((employee) => {
    const searchText = [employee.name, employee.employeeId, employee.department, employee.manager]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(query.trim().toLowerCase());
  });

  const filteredRequests = leaveRequests.filter((leave) => {
    const matchesStatus =
      statusFilter === "All" ||
      String(leave.status || "")
        .toLowerCase()
        .includes(statusFilter.toLowerCase());
    const searchText = [leave.employee, leave.leaveType, leave.dates, leave.approver, leave.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesStatus && searchText.includes(query.trim().toLowerCase());
  });

  const approvedCount = leaveRequests.filter((leave) => isApproved(leave.status)).length;
  const pendingCount = leaveRequests.filter((leave) => isPending(leave.status)).length;
  const leaveDays = leaveRequests.reduce((total, leave) => total + parseLeaveDays(leave.dates), 0);

  function openCreateModal() {
    setLeaveForm(createInitialForm(employees));
    setMessage("");
    setModalOpen(true);
  }

  function updateStatus(leave, status) {
    startTransition(async () => {
      const updated = await updateLeaveRequestAction(leave.id, {
        ...leave,
        status,
        tone: statusTone(status)
      });
      setLeaveRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${leave.employee} leave marked as ${status}.`);
    });
  }

  return (
    <SuiteShell
      eyebrow="Absence Management"
      title="Leaves & Holidays"
      primaryHref="/hrms"
      primaryLabel="Open Employees"
      brandEyebrow="Leave Desk"
    >
      <section className="page-section stats-grid">
        <div className="score-card">
          <strong>{employeeRows.length}</strong>
          <small>Employees tracked</small>
        </div>
        <div className="score-card">
          <strong>{pendingCount}</strong>
          <small>Pending approvals</small>
        </div>
        <div className="score-card">
          <strong>{approvedCount}</strong>
          <small>Approved leaves</small>
        </div>
        <div className="score-card">
          <strong>{leaveDays}</strong>
          <small>Total leave days</small>
        </div>
      </section>

      <section className="page-section panel leave-control-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Employee Leave Details</p>
            <h3>Balances, approvals, and request history</h3>
          </div>
          <div className="leave-toolbar">
            <input
              aria-label="Search employee leave details"
              className="search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search employees"
              value={query}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusFilters.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <button className="primary-button" onClick={openCreateModal} type="button">
              Add Leave
            </button>
          </div>
        </div>
        {message ? <p className="session-note">{message}</p> : null}
      </section>

      <section className="page-section panel leave-table-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Employee View</p>
            <h3>Leave summary by employee</h3>
          </div>
        </div>
        {filteredEmployeeRows.length ? (
          <table className="data-table leave-summary-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Leave Taken</th>
                <th>Balance</th>
                <th>Pending</th>
                <th>Approver</th>
                <th>Latest Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployeeRows.map((employee) => (
                <tr key={employee.employeeId || employee.id || employee.name}>
                  <td>
                    <strong>{employee.name || "Unnamed Employee"}</strong>
                    <small>{employee.employeeId || employee.id}</small>
                  </td>
                  <td>{employee.department || "General"}</td>
                  <td>{employee.leaveDays} day{employee.leaveDays === 1 ? "" : "s"}</td>
                  <td>{employee.balance}</td>
                  <td>{employee.pendingCount}</td>
                  <td>{employee.approver}</td>
                  <td>
                    <StatusBadge tone={employee.latestTone}>{employee.latestStatus}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No employee leave details found. Add employees in HRMS or create a leave request here.</p>
        )}
      </section>

      <section className="page-section panel leave-table-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Leave Requests</p>
            <h3>Approve, reject, or update employee leaves</h3>
          </div>
        </div>
        {filteredRequests.length ? (
          <table className="data-table leave-request-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Balance</th>
                <th>Approver</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((leave) => (
                <tr key={leave.id}>
                  <td>
                    <strong>{leave.employee}</strong>
                    <small>{parseLeaveDays(leave.dates)} day{parseLeaveDays(leave.dates) === 1 ? "" : "s"}</small>
                  </td>
                  <td>{leave.leaveType}</td>
                  <td>{leave.dates}</td>
                  <td>{leave.balance}</td>
                  <td>{leave.approver}</td>
                  <td>
                    <StatusBadge tone={leave.tone || statusTone(leave.status)}>{leave.status}</StatusBadge>
                  </td>
                  <td>
                    <div className="row-actions">
                      {!isApproved(leave.status) ? (
                        <button className="mini-button" disabled={isPendingTransition} onClick={() => updateStatus(leave, "Leave Accepted")} type="button">
                          Accept
                        </button>
                      ) : null}
                      <button className="mini-button" disabled={isPendingTransition} onClick={() => updateStatus(leave, "Rejected")} type="button">
                        Reject
                      </button>
                      <button className="mini-button" onClick={() => setLeaveEdit(leave)} type="button">
                        Edit
                      </button>
                      <button
                        className="mini-button danger-button"
                        disabled={isPendingTransition}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteLeaveRequestAction(leave.id);
                            setLeaveRequests((current) => current.filter((item) => item.id !== leave.id));
                            setMessage(`${leave.employee} leave request deleted.`);
                          })
                        }
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No leave requests match the current search or status filter.</p>
        )}
      </section>

      <LeaveModal
        employees={employees}
        isPending={isPendingTransition}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createLeaveRequestAction({
              ...leaveForm,
              tone: statusTone(leaveForm.status)
            });
            setLeaveRequests((current) => [created, ...current]);
            setLeaveForm(createInitialForm(employees));
            setModalOpen(false);
            setMessage(`Leave request added for ${created.employee}.`);
          })
        }
        open={modalOpen}
        setState={setLeaveForm}
        state={leaveForm}
        title="Create Leave Request"
      />

      <LeaveModal
        employees={employees}
        isPending={isPendingTransition}
        onClose={() => setLeaveEdit(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateLeaveRequestAction(leaveEdit.id, {
              ...leaveEdit,
              tone: statusTone(leaveEdit.status)
            });
            setLeaveRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setLeaveEdit(null);
            setMessage(`Leave request updated for ${updated.employee}.`);
          })
        }
        open={!!leaveEdit}
        setState={setLeaveEdit}
        state={leaveEdit}
        title="Update Leave Request"
      />
    </SuiteShell>
  );
}

function LeaveModal({ employees, isPending, onClose, onSubmit, open, setState, state, title }) {
  if (!state) return null;

  const update = (field) => (event) => {
    const value = event.target.value;

    setState((current) => {
      const next = {
        ...current,
        [field]: value
      };

      if (field === "employee") {
        const selectedEmployee = employees.find((employee) => employee.name === value);
        next.approver = selectedEmployee?.manager || current.approver || "HR";
      }

      return next;
    });
  };

  return (
    <Modal open={open} title={title} eyebrow="Leave Management" onClose={onClose}>
      <div className="form-grid">
        <label>
          <span>Employee</span>
          <input list="leave-employees" value={state.employee || ""} onChange={update("employee")} />
          <datalist id="leave-employees">
            {employees.map((employee) => (
              <option key={employee.id || employee.employeeId || employee.name} value={employee.name} />
            ))}
          </datalist>
        </label>
        <label>
          <span>Leave Type</span>
          <select value={state.leaveType || leaveTypes[0]} onChange={update("leaveType")}>
            {leaveTypes.map((leaveType) => (
              <option key={leaveType}>{leaveType}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Dates</span>
          <input placeholder="2026-05-12 to 2026-05-14" value={state.dates || ""} onChange={update("dates")} />
        </label>
        <label>
          <span>Balance</span>
          <input value={state.balance || ""} onChange={update("balance")} />
        </label>
        <label>
          <span>Approver</span>
          <input value={state.approver || ""} onChange={update("approver")} />
        </label>
        <label>
          <span>Status</span>
          <select value={state.status || "Review"} onChange={update("status")}>
            {statusFilters.filter((status) => status !== "All").map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="modal-actions">
        <button className="ghost-button" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="primary-button" disabled={isPending} onClick={onSubmit} type="button">
          {isPending ? "Saving..." : "Save Leave"}
        </button>
      </div>
    </Modal>
  );
}
