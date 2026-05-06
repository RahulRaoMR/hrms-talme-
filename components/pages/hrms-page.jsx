"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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
  employeeId: "",
  email: "",
  name: "",
  department: "",
  location: "",
  manager: "",
  grade: "",
  joiningDate: "",
  salaryBand: "",
  bankStatus: "",
  status: "",
  tone: "gold"
};

const employeeCreateSeed = {
  employeeCode: "TTPL-",
  employeeName: "",
  displayName: "",
  mobileCountry: "+91",
  mobileNumber: "",
  email: "",
  gender: "Male",
  punchInBranch: "",
  masterBranch: "",
  department: "",
  designation: "",
  employeeType: "",
  doorLockPermission: "Yes",
  salaryType: "Monthly",
  salaryAmount: "0",
  approvedMonthlyCtc: "",
  payrollGroup: "",
  providentFund: "",
  uan: "",
  esic: "",
  esiNumber: "",
  address: "",
  bankName: "",
  branchName: "",
  accountNo: "",
  ifscCode: "",
  emergencyCountry: "+91",
  emergencyNumber: "",
  emergencyPersonName: "",
  emergencyRelation: "",
  emergencyAddress: "",
  dateOfBirth: "",
  dateOfJoining: "",
  referenceName: "",
  referenceCountry: "+91",
  referenceNumber: ""
};

const leaveSeed = {
  employee: "",
  leaveType: "",
  dates: "",
  balance: "",
  approver: "",
  status: "",
  tone: "gold"
};

const attendanceSeed = {
  employee: "",
  present: "",
  leaves: "",
  overtime: "",
  shift: "",
  lockState: "",
  tone: "gold"
};

export default function HrmsPageClient({ data }) {
  const [employees, setEmployees] = useState(data?.employees || []);
  const [leaveRequests, setLeaveRequests] = useState(data?.leaveRequests || []);
  const [attendanceRecords, setAttendanceRecords] = useState(data?.attendanceRecords || []);
  const [documents] = useState(data?.documents || []);
  const [salarySheet, setSalarySheet] = useState({ rows: [], generated: false, monthLabel: "" });
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [employeeEdit, setEmployeeEdit] = useState(null);
  const [leaveEdit, setLeaveEdit] = useState(null);
  const [attendanceEdit, setAttendanceEdit] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({ ...employeeCreateSeed });
  const [leaveForm, setLeaveForm] = useState(leaveSeed);
  const [attendanceForm, setAttendanceForm] = useState(attendanceSeed);
  const [isPending, startTransition] = useTransition();
  const salarySheetTotal = salarySheet.rows.reduce((total, row) => total + row.totalPay, 0);

  const generateSalarySheet = () => {
    setSalarySheet(generateSalaryRows(employees, attendanceRecords));
  };

  const downloadSalarySheet = () => {
    downloadCsv(`salary-sheet-${salarySheet.monthLabel || "current-month"}.csv`, salarySheet.rows);
  };

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
          <button
            className="mini-button"
            onClick={() => {
              setEmployeeForm({ ...employeeCreateSeed });
              setEmployeeModalOpen(true);
            }}
            type="button"
          >
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
            {employees.length ? employees.map((employee) => (
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
            )) : (
              <tr>
                <td colSpan="7">No employees added yet.</td>
              </tr>
            )}
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
            <button className="score-card salary-generate-card" onClick={generateSalarySheet} type="button">
              <strong>3</strong><small>Generate salary sheet</small>
            </button>
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

      {salarySheet.generated ? (
        <section className="page-section panel salary-sheet-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Generated Salary Sheet</p>
              <h3>{salarySheet.monthLabel}</h3>
            </div>
            {salarySheet.rows.length ? (
              <button className="mini-button" onClick={downloadSalarySheet} type="button">
                Download CSV
              </button>
            ) : null}
          </div>
          {salarySheet.rows.length ? (
            <table className="data-table salary-sheet-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Salary CTC</th>
                  <th>Net Pay</th>
                  <th>Days</th>
                  <th>Worked</th>
                  <th>Paid Leave</th>
                  <th>Salary Days</th>
                  <th>LOP</th>
                  <th>OT</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {salarySheet.rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.name}</td>
                    <td>{formatInr(row.monthlyCtc)}</td>
                    <td>{formatInr(row.monthlyNetPay)}</td>
                    <td>{row.monthDays}</td>
                    <td>{row.presentDays}</td>
                    <td>{row.paidLeaves}</td>
                    <td>{formatNumber(row.salaryDays)}</td>
                    <td>{formatNumber(row.lopDays)}</td>
                    <td>{row.otHours}h / {formatInr(row.otAmount)}</td>
                    <td><strong>{formatInr(row.totalPay)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="9">Total salary payable</td>
                  <td><strong>{formatInr(salarySheetTotal)}</strong></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="empty-state">No salary rows generated. Add matching employees in Employee Master and Monthly Attendance first.</p>
          )}
        </section>
      ) : null}

      <EmployeeCreateDrawer
        open={employeeModalOpen}
        state={employeeForm}
        setState={setEmployeeForm}
        isPending={isPending}
        onClose={() => setEmployeeModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createEmployeeAction(toEmployeePayload(employeeForm));
            setEmployees((current) => [created, ...current]);
            setEmployeeForm({ ...employeeCreateSeed });
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
          ["email", "Email"],
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
            setLeaveForm(leaveSeed);
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
            setAttendanceForm(attendanceSeed);
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

function toEmployeePayload(form) {
  const employeeName = form.employeeName || form.displayName || `Employee ${form.employeeCode}`;
  const location = form.punchInBranch || form.masterBranch || "Head Office";
  const monthlyCtc = form.approvedMonthlyCtc || form.salaryAmount;
  const salaryBand = [form.salaryType, monthlyCtc ? `INR ${monthlyCtc}` : ""].filter(Boolean).join(" - ");

  return {
    employeeId: form.employeeCode || String(Date.now()),
    email: form.email,
    name: employeeName,
    department: form.department || "General",
    location,
    manager: form.emergencyPersonName || "Not Assigned",
    grade: form.designation || form.employeeType || "Employee",
    joiningDate: form.dateOfJoining || new Date().toISOString().slice(0, 10),
    salaryBand: salaryBand || "Monthly - INR 0",
    bankStatus: form.bankName || form.accountNo ? "Bank Added" : "Pending",
    status: "Active",
    tone: "gold"
  };
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function formatInr(value) {
  return inrFormatter.format(Math.round(Number(value) || 0));
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : Number(value || 0).toFixed(2);
}

function normalizeLookup(value) {
  return String(value || "").trim().toLowerCase();
}

function extractSalaryNumber(salaryBand) {
  const normalized = String(salaryBand || "").toLowerCase();
  const lpaMatch = normalized.match(/(\d+(?:\.\d+)?)\s*lpa/);

  if (lpaMatch) {
    return {
      annualCtc: Number(lpaMatch[1]) * 100000
    };
  }

  const amount = Number(normalized.replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0] || 0);

  if (!amount) {
    return { annualCtc: 0 };
  }

  if (normalized.includes("annual") || normalized.includes("year") || normalized.includes("ctc")) {
    return { annualCtc: amount };
  }

  if (normalized.includes("month")) {
    return { annualCtc: amount * 12 };
  }

  return {
    annualCtc: amount >= 100000 ? amount : amount * 12
  };
}

function calculateMonthlyPayFromCtc(annualCtc) {
  const monthlyCtc = (Number(annualCtc) || 0) / 12;
  const basic = monthlyCtc * 0.5;
  const employerPf = Math.min(basic, 15000) * 0.12;
  const edli = basic <= 15000 ? basic * 0.005 : 75;
  const epfAdmin = basic <= 15000 ? basic * 0.005 : 75;
  const employerTotal = employerPf + edli + epfAdmin;
  const grossPay = monthlyCtc - employerTotal;
  const employeePf = employerPf;
  const medicalInsurance = 500;
  const professionalTax = grossPay >= 25000 ? 200 : 0;
  const employeeTotal = employeePf + medicalInsurance + professionalTax;

  return {
    monthlyCtc,
    monthlyNetPay: Math.max(0, grossPay - employeeTotal)
  };
}

function countSundays(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let sundays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === 0) {
      sundays += 1;
    }
  }

  return sundays;
}

function generateSalaryRows(employees, attendanceRecords) {
  const today = new Date();
  const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const sundays = countSundays(today.getFullYear(), today.getMonth());
  const monthLabel = today.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const attendanceByEmployee = new Map();

  attendanceRecords.forEach((record) => {
    attendanceByEmployee.set(normalizeLookup(record.employee), record);
  });

  const rows = employees
    .map((employee) => {
      const attendance =
        attendanceByEmployee.get(normalizeLookup(employee.name)) ||
        attendanceByEmployee.get(normalizeLookup(employee.employeeId));

      if (!attendance) {
        return null;
      }

      const { annualCtc } = extractSalaryNumber(employee.salaryBand);
      const { monthlyCtc, monthlyNetPay } = calculateMonthlyPayFromCtc(annualCtc);
      const presentDays = Number(attendance.present) || 0;
      const paidLeaves = Number(attendance.leaves) || 0;
      const holidays = 0;
      const salaryDays = presentDays + sundays + holidays + paidLeaves;
      const perDayCost = monthDays ? monthlyNetPay / monthDays : 0;
      const perHourCost = perDayCost / 8.5;
      const otHours = Number(attendance.overtime) || 0;
      const otAmount = perHourCost * 1.5 * otHours;
      const salaryExcludingOt = perDayCost * salaryDays;
      const totalPay = salaryExcludingOt + otAmount;

      return {
        employeeId: employee.employeeId || employee.id,
        name: employee.name,
        monthlyCtc,
        monthlyNetPay,
        month: monthLabel,
        monthDays,
        perDayCost,
        perHourCost,
        presentDays,
        sundays,
        holidays,
        paidLeaves,
        salaryDays,
        salaryExcludingOt,
        otHours,
        otAmount,
        otApplicability: "1.5x",
        totalPay,
        lopDays: monthDays - salaryDays
      };
    })
    .filter(Boolean);

  return {
    rows,
    generated: true,
    monthLabel
  };
}

function downloadCsv(fileName, rows) {
  const headers = [
    "Name",
    "Salary CTC",
    "Salary Net Pay",
    "Month",
    "No. Of Days",
    "Per Day Cost",
    "Per Hour Cost",
    "No of days worked",
    "Sunday",
    "Holidays",
    "Paid leaves",
    "Total Working days for salary",
    "Salary Excluding OT",
    "OT Hours",
    "OT Amount",
    "OT Applicability",
    "Total",
    "LOP"
  ];
  const csvRows = rows.map((row) => [
    row.name,
    Math.round(row.monthlyCtc),
    Math.round(row.monthlyNetPay),
    row.month,
    row.monthDays,
    row.perDayCost.toFixed(2),
    row.perHourCost.toFixed(2),
    row.presentDays,
    row.sundays,
    row.holidays,
    row.paidLeaves,
    row.salaryDays,
    row.salaryExcludingOt.toFixed(2),
    row.otHours,
    row.otAmount.toFixed(2),
    row.otApplicability,
    row.totalPay.toFixed(2),
    row.lopDays
  ]);
  const csv = [headers, ...csvRows]
    .map((cells) => cells.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function EmployeeCreateDrawer({ open, state, setState, onSubmit, onClose, isPending }) {
  const [openSections, setOpenSections] = useState({
    basic: true,
    bank: false,
    legal: false,
    emergency: false,
    personal: false,
    reference: false
  });

  useEffect(() => {
    if (open && state.employeeCode === "37") {
      setState((current) => ({ ...current, employeeCode: employeeCreateSeed.employeeCode }));
    }
  }, [open, setState, state.employeeCode]);

  if (!open) return null;

  const update = (key) => (event) => {
    setState((current) => ({ ...current, [key]: event.target.value }));
  };

  const toggle = (key) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const expandOnly = (key) => {
    setOpenSections((current) => ({ ...current, [key]: true }));
  };

  return (
    <div className="employee-drawer-shell" role="presentation">
      <button className="employee-drawer-backdrop" onClick={onClose} type="button" aria-label="Close employee form" />
      <aside className="employee-drawer" role="dialog" aria-modal="true" aria-labelledby="employee-drawer-title">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <header className="employee-drawer-titlebar">
            <h2 id="employee-drawer-title">Add Details</h2>
            <button className="employee-close-button" onClick={onClose} type="button" aria-label="Close">
              x
            </button>
          </header>

          <div className="employee-accordion">
            <EmployeeSection title="Basic Details" open={openSections.basic} onToggle={() => toggle("basic")}>
              <div className="pooja-form-grid">
                <TextField label="Employee Code" required value={state.employeeCode} onChange={update("employeeCode")} />
                <TextField label="Employee Name" required placeholder="Enter Employee Name" value={state.employeeName} onChange={update("employeeName")} />
                <TextField label="Display Name" placeholder="Enter Display Name" value={state.displayName} onChange={update("displayName")} />
                <PhoneField label="Mobile Number" required country={state.mobileCountry} number={state.mobileNumber} onCountryChange={update("mobileCountry")} onNumberChange={update("mobileNumber")} />
                <TextField label="Email" type="email" placeholder="Enter Employee Email" value={state.email} onChange={update("email")} />
                <RadioGroup label="Gender" required name="gender" value={state.gender} options={["Male", "Female", "Other"]} onChange={update("gender")} />
                <SelectField label="Punch In Branch" required placeholder="Select Branches" value={state.punchInBranch} onChange={update("punchInBranch")} options={["Main Branch", "Corporate Office", "Remote"]} />
                <SelectField label="Master Branch" required placeholder="Select Master Branches" value={state.masterBranch} onChange={update("masterBranch")} options={["Main Branch", "Corporate Office", "Remote"]} />
                <SelectField label="Department" required placeholder="Select/Create Department" value={state.department} onChange={update("department")} options={["HR", "Operations", "Finance", "Sales", "Technology"]} />
                <SelectField label="Designation" required placeholder="Select/Create Designation" value={state.designation} onChange={update("designation")} options={["Associate", "Executive", "Manager", "Lead", "Admin"]} />
                <SelectField label="Employee Type" placeholder="Select Employee Type" value={state.employeeType} onChange={update("employeeType")} options={["Full Time", "Part Time", "Contract", "Intern"]} />
                <RadioGroup label="Door Lock Permission" required name="door-lock" value={state.doorLockPermission} options={["Yes", "No"]} onChange={update("doorLockPermission")} />
                <RadioGroup label="Salary Type" required name="salary-type" value={state.salaryType} options={["Monthly", "Hourly", "Compliance"]} onChange={update("salaryType")} />
                <TextField label="" type="number" value={state.salaryAmount} onChange={update("salaryAmount")} />
                <TextField label="Approved Monthly CTC" type="number" placeholder="Enter Approved Monthly CTC" value={state.approvedMonthlyCtc} onChange={update("approvedMonthlyCtc")} />
                <SelectField label="Payroll Group" required placeholder="Select Payroll Group" value={state.payrollGroup} onChange={update("payrollGroup")} options={["Default Payroll", "Staff Payroll", "Contract Payroll"]} />
                <TextField label="Provident Fund (PF)" placeholder="Enter PF Account Number" value={state.providentFund} onChange={update("providentFund")} />
                <TextField label="Universal Account Number (UAN)" placeholder="Enter 12-Digit UAN Number" value={state.uan} onChange={update("uan")} />
                <TextField label="Employee State Insurance Corporation (ESIC)" placeholder="Enter 10-Digit ESIC IP Number" value={state.esic} onChange={update("esic")} />
                <TextField label="ESI Number" placeholder="Enter ESI Number" value={state.esiNumber} onChange={update("esiNumber")} />
                <TextareaField label="Address" value={state.address} onChange={update("address")} />
              </div>
            </EmployeeSection>

            <EmployeeSection title="Bank Details" open={openSections.bank} onToggle={() => toggle("bank")}>
              <div className="pooja-form-grid">
                <TextField label="Bank Name" placeholder="Enter Bank Name" value={state.bankName} onChange={update("bankName")} />
                <TextField label="Branch Name" placeholder="Enter Branch Name" value={state.branchName} onChange={update("branchName")} />
                <TextField label="Account No" placeholder="Enter Account No" value={state.accountNo} onChange={update("accountNo")} />
                <TextField label="IFSC Code" placeholder="Enter IFSC Code" value={state.ifscCode} onChange={update("ifscCode")} />
              </div>
            </EmployeeSection>

            <EmployeeSection title="Legal Documents" open={openSections.legal} onToggle={() => toggle("legal")}>
              <div className="pooja-form-grid">
                {["Aadhar Card", "Driving Licence", "PAN Card", "Passport Size Photo"].map((label) => (
                  <FileField key={label} label={label} />
                ))}
              </div>
            </EmployeeSection>

            <EmployeeSection title="Emergency Contact Information" open={openSections.emergency} onToggle={() => toggle("emergency")}>
              <div className="pooja-form-grid">
                <PhoneField label="Contact Number" country={state.emergencyCountry} number={state.emergencyNumber} onCountryChange={update("emergencyCountry")} onNumberChange={update("emergencyNumber")} />
                <TextField label="Contact Person Name" placeholder="Enter Person Name" value={state.emergencyPersonName} onChange={update("emergencyPersonName")} />
                <TextField label="Relation with the Contact" placeholder="Enter Relation" value={state.emergencyRelation} onChange={update("emergencyRelation")} />
                <TextareaField label="Address" value={state.emergencyAddress} onChange={update("emergencyAddress")} />
              </div>
            </EmployeeSection>

            <EmployeeSection title="Personal Information" open={openSections.personal} onToggle={() => toggle("personal")}>
              <div className="pooja-form-grid compact-grid">
                <TextField label="Date of Birth" type="date" value={state.dateOfBirth} onChange={update("dateOfBirth")} />
                <TextField label="Date of Joining" type="date" value={state.dateOfJoining} onChange={update("dateOfJoining")} />
              </div>
            </EmployeeSection>

            <EmployeeSection title="Reference" open={openSections.reference} onToggle={() => toggle("reference")}>
              <div className="pooja-form-grid">
                <TextField label="Name" placeholder="Enter Name" value={state.referenceName} onChange={update("referenceName")} />
                <PhoneField label="Contact Number" country={state.referenceCountry} number={state.referenceNumber} onCountryChange={update("referenceCountry")} onNumberChange={update("referenceNumber")} />
                <button className="pooja-add-more" type="button" onClick={() => expandOnly("reference")}>
                  Add More
                </button>
              </div>
            </EmployeeSection>
          </div>

          <footer className="employee-drawer-actions">
            <button className="pooja-outline-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="pooja-secondary-button" type="button" onClick={() => setState({ ...employeeCreateSeed })}>
              Reset
            </button>
            <button className="pooja-primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function EmployeeSection({ title, open, onToggle, children }) {
  return (
    <section className={`employee-section ${open ? "open" : ""}`}>
      <button className="employee-section-head" type="button" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <span className="section-chevron" aria-hidden="true" />
      </button>
      {open ? <div className="employee-section-body">{children}</div> : null}
    </section>
  );
}

function RequiredMark({ required }) {
  return required ? <em>*</em> : null;
}

function TextField({ label, required, ...props }) {
  return (
    <label className="pooja-field">
      {label ? <span>{label} <RequiredMark required={required} /></span> : null}
      <input required={required} {...props} />
    </label>
  );
}

function TextareaField({ label, required, ...props }) {
  return (
    <label className="pooja-field full-span">
      <span>{label} <RequiredMark required={required} /></span>
      <textarea required={required} {...props} />
    </label>
  );
}

function SelectField({ label, required, placeholder, value, onChange, options }) {
  return (
    <label className="pooja-field full-span">
      <span>{label}<RequiredMark required={required} /></span>
      <select required={required} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function RadioGroup({ label, required, name, value, options, onChange }) {
  return (
    <fieldset className="pooja-radio-group">
      <legend>{label}<RequiredMark required={required} /></legend>
      <div>
        {options.map((option) => (
          <label key={option}>
            <input
              checked={value === option}
              name={name}
              onChange={onChange}
              type="radio"
              value={option}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PhoneField({ label, required, country, number, onCountryChange, onNumberChange }) {
  return (
    <div className="pooja-field full-span">
      <span>{label} <RequiredMark required={required} /></span>
      <div className="pooja-phone-field">
        <select aria-label={`${label} country code`} value={country} onChange={onCountryChange}>
          <option value="+91">+91</option>
          <option value="+1">+1</option>
          <option value="+44">+44</option>
        </select>
        <input required={required} placeholder="Enter Number" value={number} onChange={onNumberChange} />
      </div>
    </div>
  );
}

function FileField({ label }) {
  return (
    <label className="pooja-file-field full-span">
      <span>{label}</span>
      <input type="file" />
    </label>
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
