"use client";

import { useEffect, useMemo, useState } from "react";
import SuiteShell from "@/components/suite-shell";
import StatusBadge from "@/components/status-badge";
import { apiUrl } from "@/lib/api-client";

const storageKey = "talme-employee-shift-assignments";

const shiftTemplates = {
  General: { start: "09:00", end: "18:00", breakMinutes: "60" },
  Morning: { start: "06:00", end: "14:00", breakMinutes: "30" },
  Evening: { start: "14:00", end: "22:00", breakMinutes: "30" },
  Night: { start: "22:00", end: "06:00", breakMinutes: "45" },
  Custom: { start: "", end: "", breakMinutes: "0" }
};

const defaultWeekOff = "Sunday";

function createAssignment(employee, templateName = "General") {
  const template = shiftTemplates[templateName] || shiftTemplates.General;

  return {
    employeeId: employee.employeeId || employee.id,
    shiftName: templateName,
    start: template.start,
    end: template.end,
    breakMinutes: template.breakMinutes,
    weekOff: defaultWeekOff,
    status: "Assigned"
  };
}

function assignmentKey(employee) {
  return employee.employeeId || employee.id;
}

function loadSavedAssignments() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function normalizeServerAssignments(rows = []) {
  return rows.reduce((assignments, row) => {
    if (!row?.employeeId) {
      return assignments;
    }

    assignments[row.employeeId] = row;
    return assignments;
  }, {});
}

async function upsertShiftAssignment(assignment) {
  const row = {
    ...assignment,
    id: assignment.id || `shift-${assignment.employeeId}`
  };
  const path = `/api/shift-assignments/${encodeURIComponent(row.id)}`;
  const response = await fetch(apiUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row)
  });

  if (response.ok) {
    return response.json();
  }

  const createResponse = await fetch(apiUrl("/api/shift-assignments"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row)
  });

  if (!createResponse.ok) {
    throw new Error("Unable to save shift assignment.");
  }

  return createResponse.json();
}

function calculateShiftHours(start, end, breakMinutes) {
  if (!start || !end) return "0h";

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  const totalMinutes = Math.max(0, endTotal - startTotal - Number(breakMinutes || 0));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default function ShiftsPageClient({ data }) {
  const employees = useMemo(() => data?.employees || [], [data?.employees]);
  const serverAssignments = useMemo(() => normalizeServerAssignments(data?.shiftAssignments || []), [data?.shiftAssignments]);
  const [assignments, setAssignments] = useState({});
  const [bulkShift, setBulkShift] = useState("General");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = loadSavedAssignments();
    const nextAssignments = {};

    employees.forEach((employee) => {
      const key = assignmentKey(employee);
      nextAssignments[key] = serverAssignments[key] || saved[key] || createAssignment(employee);
    });

    setAssignments(nextAssignments);
  }, [employees, serverAssignments]);

  useEffect(() => {
    if (!Object.keys(assignments).length) return;

    window.localStorage.setItem(storageKey, JSON.stringify(assignments));
  }, [assignments]);

  const assignedCount = Object.values(assignments).filter((assignment) => assignment.status === "Assigned").length;
  const nightCount = Object.values(assignments).filter((assignment) => assignment.shiftName === "Night").length;

  const saveAssignment = async (assignment, employee) => {
    try {
      const saved = await upsertShiftAssignment(assignment);
      setAssignments((current) => ({
        ...current,
        [assignment.employeeId]: saved
      }));
      setMessage(`Shift updated for ${employee.name}.`);
    } catch {
      setMessage(`Shift updated for ${employee.name}, but could not sync to server.`);
    }
  };

  const updateAssignment = (employee, patch) => {
    const key = assignmentKey(employee);
    const nextAssignment = {
      ...(assignments[key] || createAssignment(employee)),
      ...patch,
      id: assignments[key]?.id || `shift-${key}`,
      employeeId: key,
      status: "Assigned"
    };

    setAssignments((current) => ({
      ...current,
      [key]: nextAssignment
    }));
    saveAssignment(nextAssignment, employee);
  };

  const updateShiftTemplate = (employee, shiftName) => {
    const template = shiftTemplates[shiftName] || shiftTemplates.General;
    updateAssignment(employee, {
      shiftName,
      start: template.start,
      end: template.end,
      breakMinutes: template.breakMinutes
    });
  };

  const applyBulkShift = () => {
    const nextAssignments = {};

    employees.forEach((employee) => {
      const key = assignmentKey(employee);
      const existing = assignments[key] || createAssignment(employee);
      const template = shiftTemplates[bulkShift] || shiftTemplates.General;
      nextAssignments[key] = {
        ...existing,
        id: existing.id || `shift-${key}`,
        employeeId: key,
        shiftName: bulkShift,
        start: template.start,
        end: template.end,
        breakMinutes: template.breakMinutes,
        status: "Assigned"
      };
    });

    setAssignments(nextAssignments);
    setMessage(`${bulkShift} shift applied to ${employees.length} employee${employees.length === 1 ? "" : "s"}.`);
    employees.forEach((employee) => {
      const key = assignmentKey(employee);
      saveAssignment(nextAssignments[key], employee);
    });
  };

  return (
    <SuiteShell
      eyebrow="Operations Control"
      title="Manage Shifts"
      primaryHref="/hrms"
      primaryLabel="Open Employees"
      brandEyebrow="Shift Suite"
    >
      <section className="page-section stats-grid">
        <div className="score-card">
          <strong>{employees.length}</strong>
          <small>Total employees</small>
        </div>
        <div className="score-card">
          <strong>{assignedCount}</strong>
          <small>Shift assigned</small>
        </div>
        <div className="score-card">
          <strong>{nightCount}</strong>
          <small>Night shift</small>
        </div>
        <div className="score-card">
          <strong>{defaultWeekOff}</strong>
          <small>Default week off</small>
        </div>
      </section>

      <section className="page-section panel shift-planner-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Bulk Shift</p>
            <h3>Assign shift timing to all employees</h3>
          </div>
          <div className="shift-bulk-actions">
            <select value={bulkShift} onChange={(event) => setBulkShift(event.target.value)}>
              {Object.keys(shiftTemplates).map((shiftName) => (
                <option key={shiftName}>{shiftName}</option>
              ))}
            </select>
            <button className="primary-button" onClick={applyBulkShift} type="button" disabled={!employees.length}>
              Apply To All
            </button>
          </div>
        </div>
        {message ? <p className="session-note">{message}</p> : null}
      </section>

      <section className="page-section panel shift-table-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Employee Shift Roster</p>
            <h3>Every employee with time shift</h3>
          </div>
        </div>

        {employees.length ? (
          <table className="data-table shift-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Start</th>
                <th>End</th>
                <th>Break</th>
                <th>Total</th>
                <th>Week Off</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const key = assignmentKey(employee);
                const assignment = assignments[key] || createAssignment(employee);

                return (
                  <tr key={key}>
                    <td>
                      <strong>{employee.name || "Unnamed Employee"}</strong>
                      <small>{employee.employeeId || employee.id}</small>
                    </td>
                    <td>{employee.department || "General"}</td>
                    <td>
                      <select value={assignment.shiftName} onChange={(event) => updateShiftTemplate(employee, event.target.value)}>
                        {Object.keys(shiftTemplates).map((shiftName) => (
                          <option key={shiftName}>{shiftName}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="time" value={assignment.start} onChange={(event) => updateAssignment(employee, { start: event.target.value, shiftName: "Custom" })} />
                    </td>
                    <td>
                      <input type="time" value={assignment.end} onChange={(event) => updateAssignment(employee, { end: event.target.value, shiftName: "Custom" })} />
                    </td>
                    <td>
                      <input min="0" step="15" type="number" value={assignment.breakMinutes} onChange={(event) => updateAssignment(employee, { breakMinutes: event.target.value })} />
                    </td>
                    <td>{calculateShiftHours(assignment.start, assignment.end, assignment.breakMinutes)}</td>
                    <td>
                      <select value={assignment.weekOff} onChange={(event) => updateAssignment(employee, { weekOff: event.target.value })}>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                          <option key={day}>{day}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <StatusBadge tone="teal">{assignment.status}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No employees found. Add employees in HRMS first, then assign shifts here.</p>
        )}
      </section>
    </SuiteShell>
  );
}
