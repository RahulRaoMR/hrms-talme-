"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createAttendanceRecordAction,
  createEmployeeAction,
  createLeaveRequestAction,
  deleteAttendanceRecordAction,
  deleteEmployeeAction,
  deleteLeaveRequestAction,
  updateAttendanceRecordAction,
  updateEmployeeAction,
  updateLeaveRequestAction
} from "@/app/actions";
import Modal from "@/components/modal";
import SuiteShell from "@/components/suite-shell";
import StatusBadge from "@/components/status-badge";

const employeeSeed = {
  employeeId: "TLM-2201",
  name: "Anita Rao",
  department: "HR Operations",
  location: "Bengaluru Hub",
  manager: "Ritika Nair",
  grade: "L2",
  joiningDate: "2024-06-10",
  salaryBand: "INR 8.4L",
  bankStatus: "Pending",
  status: "Probation",
  tone: "gold"
};

const leaveSeed = {
  employee: "Anita Rao",
  leaveType: "Casual Leave",
  dates: "May 05 - May 06",
  balance: "6 days",
  approver: "Ritika Nair",
  status: "Manager Review",
  tone: "gold"
};

const attendanceSeed = {
  employee: "Anita Rao",
  present: 23,
  leaves: 1,
  overtime: 2,
  shift: "General",
  lockState: "Review",
  tone: "gold"
};

export default function HrmsPageClient({ data }) {
  const [employees, setEmployees] = useState(data?.employees || []);
  const [leaveRequests, setLeaveRequests] = useState(data?.leaveRequests || []);
  const [attendanceRecords, setAttendanceRecords] = useState(data?.attendanceRecords || []);
  const [documents] = useState(data?.documents || []);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [employeeEdit, setEmployeeEdit] = useState(null);
  const [leaveEdit, setLeaveEdit] = useState(null);
  const [attendanceEdit, setAttendanceEdit] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(employeeSeed);
  const [leaveForm, setLeaveForm] = useState(leaveSeed);
  const [attendanceForm, setAttendanceForm] = useState(attendanceSeed);
  const [isPending, startTransition] = useTransition();

  return (
    <SuiteShell
      eyebrow="HRMS Module"
      title="Employee Lifecycle, Attendance, Leave, and Payroll Readiness"
      primaryHref="/payroll"
      primaryLabel="Open Payroll"
      brandEyebrow="HRMS Suite"
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Employee Master</p>
            <h3>Profiles, bank, salary, and lifecycle</h3>
          </div>
          <button className="mini-button" onClick={() => setEmployeeModalOpen(true)} type="button">
            Add Employee
          </button>
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
              <th>Actions</th>
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
                <td>
                  <div className="row-actions">
                    <Link className="mini-button" href={`/employees/${employee.id}`}>
                      View
                    </Link>
                    <button
                      className="mini-button"
                      onClick={() => setEmployeeEdit(employee)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="mini-button danger-button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteEmployeeAction(employee.id);
                          setEmployees((current) => current.filter((item) => item.id !== employee.id));
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
      </section>

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Attendance &amp; T&amp;A</p>
              <h3>Monthly attendance sheet</h3>
            </div>
            <button className="mini-button" onClick={() => setAttendanceModalOpen(true)} type="button">
              Add Attendance
            </button>
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
                <th>Actions</th>
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
                  <td>
                    <div className="row-actions">
                      <button className="mini-button" onClick={() => setAttendanceEdit(record)} type="button">
                        Edit
                      </button>
                      <button
                        className="mini-button danger-button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteAttendanceRecordAction(record.id);
                            setAttendanceRecords((current) => current.filter((item) => item.id !== record.id));
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
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Leave Management</p>
              <h3>Balances and approvals</h3>
            </div>
            <button className="mini-button" onClick={() => setLeaveModalOpen(true)} type="button">
              Add Leave
            </button>
          </div>
          <div className="card-stack">
            {leaveRequests.map((leave) => (
              <div className="process-card" key={leave.id}>
                <strong>{leave.employee}</strong>
                <small>{leave.leaveType} - {leave.dates} - {leave.balance}</small>
                <div className="row-actions">
                  <StatusBadge tone={leave.tone}>{leave.status}</StatusBadge>
                  <button className="mini-button" onClick={() => setLeaveEdit(leave)} type="button">
                    Edit
                  </button>
                  <button
                    className="mini-button danger-button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteLeaveRequestAction(leave.id);
                        setLeaveRequests((current) => current.filter((item) => item.id !== leave.id));
                      })
                    }
                    type="button"
                  >
                    Delete
                  </button>
                </div>
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

      <EntityModal
        open={employeeModalOpen}
        title="Create Employee"
        eyebrow="Employee Master"
        state={employeeForm}
        setState={setEmployeeForm}
        fields={[
          ["employeeId", "Employee ID"],
          ["name", "Name"],
          ["department", "Department"],
          ["location", "Location"],
          ["manager", "Manager"],
          ["grade", "Grade"],
          ["joiningDate", "Joining Date"],
          ["salaryBand", "Salary Band"],
          ["bankStatus", "Bank Status"],
          ["status", "Status"],
          ["tone", "Tone"]
        ]}
        isPending={isPending}
        onClose={() => setEmployeeModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createEmployeeAction(employeeForm);
            setEmployees((current) => [created, ...current]);
            setEmployeeModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!employeeEdit}
        title="Update Employee"
        eyebrow="Employee Master"
        state={employeeEdit}
        setState={setEmployeeEdit}
        fields={[
          ["employeeId", "Employee ID"],
          ["name", "Name"],
          ["department", "Department"],
          ["location", "Location"],
          ["manager", "Manager"],
          ["grade", "Grade"],
          ["joiningDate", "Joining Date"],
          ["salaryBand", "Salary Band"],
          ["bankStatus", "Bank Status"],
          ["status", "Status"],
          ["tone", "Tone"]
        ]}
        isPending={isPending}
        onClose={() => setEmployeeEdit(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateEmployeeAction(employeeEdit.id, employeeEdit);
            setEmployees((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEmployeeEdit(null);
          })
        }
      />

      <EntityModal
        open={leaveModalOpen}
        title="Create Leave Request"
        eyebrow="Leave Management"
        state={leaveForm}
        setState={setLeaveForm}
        fields={[
          ["employee", "Employee"],
          ["leaveType", "Leave Type"],
          ["dates", "Dates"],
          ["balance", "Balance"],
          ["approver", "Approver"],
          ["status", "Status"],
          ["tone", "Tone"]
        ]}
        isPending={isPending}
        onClose={() => setLeaveModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createLeaveRequestAction(leaveForm);
            setLeaveRequests((current) => [created, ...current]);
            setLeaveModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!leaveEdit}
        title="Update Leave Request"
        eyebrow="Leave Management"
        state={leaveEdit}
        setState={setLeaveEdit}
        fields={[
          ["employee", "Employee"],
          ["leaveType", "Leave Type"],
          ["dates", "Dates"],
          ["balance", "Balance"],
          ["approver", "Approver"],
          ["status", "Status"],
          ["tone", "Tone"]
        ]}
        isPending={isPending}
        onClose={() => setLeaveEdit(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateLeaveRequestAction(leaveEdit.id, leaveEdit);
            setLeaveRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setLeaveEdit(null);
          })
        }
      />

      <EntityModal
        open={attendanceModalOpen}
        title="Create Attendance Record"
        eyebrow="Attendance & T&A"
        state={attendanceForm}
        setState={setAttendanceForm}
        fields={[
          ["employee", "Employee"],
          ["present", "Present Days"],
          ["leaves", "Leaves"],
          ["overtime", "Overtime"],
          ["shift", "Shift"],
          ["lockState", "Status"],
          ["tone", "Tone"]
        ]}
        isPending={isPending}
        onClose={() => setAttendanceModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createAttendanceRecordAction(attendanceForm);
            setAttendanceRecords((current) => [created, ...current]);
            setAttendanceModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!attendanceEdit}
        title="Update Attendance Record"
        eyebrow="Attendance & T&A"
        state={attendanceEdit}
        setState={setAttendanceEdit}
        fields={[
          ["employee", "Employee"],
          ["present", "Present Days"],
          ["leaves", "Leaves"],
          ["overtime", "Overtime"],
          ["shift", "Shift"],
          ["lockState", "Status"],
          ["tone", "Tone"]
        ]}
        isPending={isPending}
        onClose={() => setAttendanceEdit(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateAttendanceRecordAction(attendanceEdit.id, attendanceEdit);
            setAttendanceRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setAttendanceEdit(null);
          })
        }
      />
    </SuiteShell>
  );
}

function EntityModal({ open, title, eyebrow, state, setState, onSubmit, onClose, isPending, fields }) {
  return (
    <Modal open={open} eyebrow={eyebrow} title={title} onClose={onClose}>
      {state ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            {fields.map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  value={state[key] ?? ""}
                  onChange={(event) =>
                    setState((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
