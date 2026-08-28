"use client";

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
} from "@/lib/api-actions";
import Modal from "@/components/modal";
import SuiteShell from "@/components/suite-shell";
import StatusBadge from "@/components/status-badge";
import { apiUrl } from "@/lib/api-client";

const ALL_ATTENDANCE_MASTER = "__all_attendance_master__";

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
  salaryNetPay: "",
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
  salaryNetPay: "",
  payrollGroup: "",
  uan: "",
  esic: "",
  address: "",
  bankName: "",
  branchName: "",
  accountNo: "",
  ifscCode: "",
  legalDocuments: {
    aadharCard: "",
    drivingLicence: "",
    panCard: "",
    passportSizePhoto: ""
  },
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

const employeeDetailSections = [
  {
    title: "Basic Details",
    fields: [
      ["employeeCode", "Employee Code"],
      ["employeeName", "Employee Name"],
      ["displayName", "Display Name"],
      ["mobileNumber", "Mobile Number"],
      ["email", "Email"],
      ["gender", "Gender"],
      ["punchInBranch", "Punch In Branch"],
      ["masterBranch", "Master Branch"],
      ["department", "Department"],
      ["designation", "Designation"],
      ["employeeType", "Employee Type"],
      ["doorLockPermission", "Door Lock Permission"],
      ["salaryType", "Salary Type"],
      ["salaryAmount", "Salary Amount"],
      ["approvedMonthlyCtc", "Approved Monthly CTC"],
      ["salaryNetPay", "Salary Net Pay"],
      ["payrollGroup", "Payroll Group"],
      ["uan", "UAN"],
      ["esic", "ESIC"],
      ["address", "Address"]
    ]
  },
  {
    title: "Bank Details",
    fields: [
      ["bankName", "Bank Name"],
      ["branchName", "Branch Name"],
      ["accountNo", "Account No"],
      ["ifscCode", "IFSC Code"]
    ]
  },
  {
    title: "Legal Documents",
    fields: [
      ["aadharCard", "Aadhar Card"],
      ["drivingLicence", "Driving Licence"],
      ["panCard", "PAN Card"],
      ["passportSizePhoto", "Passport Size Photo"]
    ]
  },
  {
    title: "Emergency Contact Information",
    fields: [
      ["emergencyNumber", "Contact Number"],
      ["emergencyPersonName", "Contact Person Name"],
      ["emergencyRelation", "Relation"],
      ["emergencyAddress", "Address"]
    ]
  },
  {
    title: "Personal Information",
    fields: [
      ["dateOfBirth", "Date of Birth"],
      ["dateOfJoining", "Date of Joining"]
    ]
  },
  {
    title: "Reference",
    fields: [
      ["referenceName", "Name"],
      ["referenceNumber", "Contact Number"]
    ]
  }
];

const legalDocumentKeys = new Set(["aadharCard", "drivingLicence", "panCard", "passportSizePhoto"]);
const imageFilePattern = /\.(avif|gif|jpe?g|png|webp)$/i;

function createEmployeeFormState(employeeCode = employeeCreateSeed.employeeCode) {
  return {
    ...employeeCreateSeed,
    employeeCode,
    legalDocuments: { ...employeeCreateSeed.legalDocuments }
  };
}

function normalizeEmployeeDetails(details) {
  return details && typeof details === "object" && !Array.isArray(details) ? details : {};
}

function splitPhoneValue(value, fallbackCountry = "+91") {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);

  return {
    country: match?.[1] || fallbackCountry,
    number: match ? match[2] : raw
  };
}

function getDocumentName(value) {
  if (!value) return "";
  if (typeof value === "object") return value.name || value.fileName || value.url || value.fileUrl || "";
  return String(value);
}

function resolveUploadUrl(value) {
  const url = String(value || "").trim();

  return url.startsWith("/uploads/") ? apiUrl(url) : url;
}

function normalizeDocumentToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .pop();
}

function findUploadedAssetForDocument(value, assets = [], employee = null, label = "") {
  const documentName = normalizeDocumentToken(getDocumentName(value));
  const ownerTokens = [
    employee?.name,
    employee?.employeeId,
    employee?.email
  ].map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  const labelToken = String(label || "").trim().toLowerCase();

  if (!documentName) return null;

  return assets.find((asset) => {
    const assetName = normalizeDocumentToken(asset?.fileName || asset?.fileUrl);
    const assetUrlName = normalizeDocumentToken(asset?.fileUrl);
    const assetOwner = String(asset?.owner || "").trim().toLowerCase();
    const assetLabel = String(asset?.label || "").trim().toLowerCase();
    const nameMatches = assetName === documentName || assetUrlName === documentName;
    const ownerMatches = !ownerTokens.length || !assetOwner || ownerTokens.includes(assetOwner);
    const labelMatches = !labelToken || !assetLabel || assetLabel.includes(labelToken) || labelToken.includes(assetLabel);

    return nameMatches && ownerMatches && labelMatches;
  }) || assets.find((asset) => {
    const assetName = normalizeDocumentToken(asset?.fileName || asset?.fileUrl);
    const assetUrlName = normalizeDocumentToken(asset?.fileUrl);

    return assetName === documentName || assetUrlName === documentName;
  }) || null;
}

function getDocumentPreviewSrc(value, assets = [], employee = null, label = "") {
  if (!value) return "";
  if (typeof value === "object") return resolveUploadUrl(value.url || value.fileUrl || value.previewUrl || "");

  const raw = String(value).trim();

  if (/^(data:image\/|blob:|https?:\/\/)/i.test(raw)) {
    return raw;
  }

  if (/^\/uploads\//i.test(raw)) {
    return resolveUploadUrl(raw);
  }

  const asset = findUploadedAssetForDocument(raw, assets, employee, label);

  if (asset?.fileUrl) return resolveUploadUrl(asset.fileUrl);

  return imageFilePattern.test(raw) ? resolveUploadUrl(`/uploads/${encodeURIComponent(raw)}`) : "";
}

function isSavedDocumentValue(value) {
  const name = getDocumentName(value);

  return Boolean(name && name !== "-");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function getEditableBankName(employee, details) {
  if (details.bankName) return details.bankName;

  return /^(bank added|pending)$/i.test(employee?.bankStatus || "") ? "" : employee?.bankStatus || "";
}

function createEmployeeEditFormState(employee) {
  const details = normalizeEmployeeDetails(employee?.employeeDetails);
  const mobile = splitPhoneValue(details.mobileNumber);
  const emergency = splitPhoneValue(details.emergencyNumber);
  const reference = splitPhoneValue(details.referenceNumber);
  const salaryParts = extractSalaryNumber(employee?.salaryBand);

  return {
    ...createEmployeeFormState(employee?.employeeId || employeeCreateSeed.employeeCode),
    id: employee?.id,
    status: employee?.status || "Active",
    tone: employee?.tone || "gold",
    originalEmployee: employee,
    employeeCode: details.employeeCode || employee?.employeeId || "",
    employeeName: details.employeeName || employee?.name || "",
    displayName: details.displayName || employee?.name || "",
    mobileCountry: mobile.country,
    mobileNumber: mobile.number,
    email: details.email || employee?.email || "",
    gender: details.gender || employeeCreateSeed.gender,
    punchInBranch: details.punchInBranch || employee?.location || "",
    masterBranch: details.masterBranch || employee?.location || "",
    department: details.department || employee?.department || "",
    designation: details.designation || employee?.grade || "",
    employeeType: details.employeeType || "",
    doorLockPermission: details.doorLockPermission || employeeCreateSeed.doorLockPermission,
    salaryType: details.salaryType || (String(employee?.salaryBand || "").toLowerCase().includes("hour") ? "Hourly" : "Monthly"),
    salaryAmount: details.salaryAmount || String(Math.round(salaryParts.annualCtc / 12) || 0),
    approvedMonthlyCtc: details.approvedMonthlyCtc || String(Math.round(salaryParts.annualCtc / 12) || ""),
    salaryNetPay: details.salaryNetPay || employee?.salaryNetPay || "",
    payrollGroup: details.payrollGroup || "",
    uan: details.uan || "",
    esic: details.esic || "",
    address: details.address || "",
    bankName: getEditableBankName(employee, details),
    branchName: details.branchName || "",
    accountNo: details.accountNo || "",
    ifscCode: details.ifscCode || "",
    legalDocuments: {
      aadharCard: details.aadharCard || "",
      drivingLicence: details.drivingLicence || "",
      panCard: details.panCard || "",
      passportSizePhoto: details.passportSizePhoto || ""
    },
    emergencyCountry: emergency.country,
    emergencyNumber: emergency.number,
    emergencyPersonName: details.emergencyPersonName || employee?.manager || "",
    emergencyRelation: details.emergencyRelation || "",
    emergencyAddress: details.emergencyAddress || "",
    dateOfBirth: details.dateOfBirth || "",
    dateOfJoining: details.dateOfJoining || employee?.joiningDate || "",
    referenceName: details.referenceName || "",
    referenceCountry: reference.country,
    referenceNumber: reference.number
  };
}

const leaveSeed = {
  employee: "",
  leaveType: "",
  dates: "",
  balance: "",
  reason: "",
  approver: "",
  status: "",
  tone: "gold"
};

const attendanceSeed = {
  employee: "",
  salaryNetPay: "",
  month: getMonthInputValue(new Date()),
  monthDays: "",
  present: "",
  sundays: "",
  holidays: "",
  paidLeaves: "",
  otHours: "",
  leaves: "0",
  overtime: "0",
  shift: "Salary Net Pay",
  lockState: "Salary Ready",
  tone: "gold"
};

function getEmployeeIdSortParts(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)(\d+)\s*$/);

  return {
    prefix: (match?.[1] || raw).toLowerCase(),
    number: match ? Number(match[2]) : Number.POSITIVE_INFINITY,
    raw: raw.toLowerCase()
  };
}

function sortEmployeesById(rows = []) {
  return [...rows].sort((left, right) => {
    const leftId = getEmployeeIdSortParts(left.employeeId || left.id);
    const rightId = getEmployeeIdSortParts(right.employeeId || right.id);
    const prefixOrder = leftId.prefix.localeCompare(rightId.prefix);

    if (prefixOrder) return prefixOrder;
    if (leftId.number !== rightId.number) return leftId.number - rightId.number;

    return leftId.raw.localeCompare(rightId.raw);
  });
}

function normalizeEmployeeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function hasDuplicateEmployeeCode(rows = [], employeeCode, ignoredEmployeeId = "") {
  const normalizedCode = normalizeEmployeeCode(employeeCode);

  if (!normalizedCode) return false;

  return rows.some((employee) =>
    employee.id !== ignoredEmployeeId &&
    normalizeEmployeeCode(employee.employeeId) === normalizedCode
  );
}

function getNextEmployeeCode(rows = []) {
  const prefix = "TTPL-";
  const nextNumber = rows.reduce((highest, employee) => {
    const employeeId = String(employee.employeeId || "").trim();
    const match = employeeId.match(/^TTPL-(\d+)$/i);

    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function normalizeResourceRows(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function fetchResourceRows(path, key) {
  const url = apiUrl(path);
  let response;

  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    if (url === path) {
      throw error;
    }

    response = await fetch(path, { cache: "no-store" });
  }

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  return normalizeResourceRows(await response.json(), key);
}

async function fetchPunchActivityRows(query = "") {
  const response = await fetch(`/api/punch-activity${query}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`/api/punch-activity failed with ${response.status}`);
  }

  return normalizeResourceRows(await response.json(), "punchActivity");
}

async function postManualPunchActivity(payload) {
  const path = "/api/punch-activity";
  const endpointUrl = apiUrl(path);
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      manualEntry: true
    })
  };

  let response;

  try {
    response = await fetch(endpointUrl, requestOptions);
  } catch (error) {
    if (endpointUrl === path) {
      throw error;
    }

    response = await fetch(path, requestOptions);
  }

  if (!response.ok && endpointUrl !== path) {
    response = await fetch(path, requestOptions);
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || "Unable to save attendance log.");
  }

  return response.json();
}

export default function HrmsPageClient({ data }) {
  const [employees, setEmployees] = useState(data?.employees || []);
  const [leaveRequests, setLeaveRequests] = useState(data?.leaveRequests || []);
  const [attendanceRecords, setAttendanceRecords] = useState(data?.attendanceRecords || []);
  const [punchActivityRecords, setPunchActivityRecords] = useState(data?.punchActivity || []);
  const [quickAttendance, setQuickAttendance] = useState(() => ({
    dateLabel: "Today",
    rows: [],
    summary: {
      total: 0,
      checkedIn: 0,
      punchedOut: 0,
      noPunch: 0
    }
  }));
  const [documents, setDocuments] = useState(data?.documents || []);
  const [uploadedAssets, setUploadedAssets] = useState(data?.assets || []);
  const [salarySheet, setSalarySheet] = useState({ rows: [], generated: false, monthLabel: "" });
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [employeeEdit, setEmployeeEdit] = useState(null);
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [attendanceMasterEmployee, setAttendanceMasterEmployee] = useState(null);
  const [attendanceLogEmployee, setAttendanceLogEmployee] = useState(null);
  const [attendanceLogDate, setAttendanceLogDate] = useState("");
  const [attendanceMasterMonth, setAttendanceMasterMonth] = useState(() => getMonthInputValue(new Date()));
  const [leaveEdit, setLeaveEdit] = useState(null);
  const [leaveToAccept, setLeaveToAccept] = useState(null);
  const [attendanceEdit, setAttendanceEdit] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [openEmployeeActionId, setOpenEmployeeActionId] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(() => createEmployeeFormState(getNextEmployeeCode(data?.employees || [])));
  const [employeeFormError, setEmployeeFormError] = useState("");
  const [leaveForm, setLeaveForm] = useState(leaveSeed);
  const [attendanceForm, setAttendanceForm] = useState(attendanceSeed);
  const [shareSummary, setShareSummary] = useState(null);
  const [isSharingPayslips, setIsSharingPayslips] = useState(false);
  const [isPending, startTransition] = useTransition();
  const salarySheetTotal = salarySheet.rows.reduce((total, row) => total + row.totalPay, 0);
  const sortedEmployees = sortEmployeesById(employees);
  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
  const matchesEmployeeSearch = (item) =>
    [
      item.employeeId,
      item.name,
      item.email,
      item.department,
      item.designation,
      item.grade,
      item.location,
      item.manager,
      item.bankStatus,
      item.status,
      item.firstPunch,
      item.lastPunch
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedEmployeeSearch));
  const visibleEmployees = normalizedEmployeeSearch
    ? sortedEmployees.filter(matchesEmployeeSearch)
    : sortedEmployees;
  const visibleQuickAttendanceRows = normalizedEmployeeSearch
    ? quickAttendance.rows.filter(matchesEmployeeSearch)
    : quickAttendance.rows;
  const visibleQuickAttendanceSummary = normalizedEmployeeSearch
    ? {
        total: visibleQuickAttendanceRows.length,
        checkedIn: visibleQuickAttendanceRows.filter((row) => row.status === "Checked In").length,
        punchedOut: visibleQuickAttendanceRows.filter((row) => row.status === "Punched Out").length,
        noPunch: visibleQuickAttendanceRows.filter((row) => row.status === "Not Yet").length
      }
    : quickAttendance.summary;
  const openAttendanceLogForRow = (row) => {
    const selectedEmployee = findEmployeeByAttendanceName(row.employeeId, employees);

    if (selectedEmployee) {
      setAttendanceLogDate(formatAttendanceStorageDate(new Date()));
      setAttendanceLogEmployee(selectedEmployee);
    }
  };
  const openAttendanceLog = (selectedEmployee, date) => {
    if (selectedEmployee) {
      setAttendanceLogDate(date || formatAttendanceStorageDate(new Date()));
      setAttendanceLogEmployee(selectedEmployee);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function refreshHrmsResources() {
      try {
        const [nextEmployees, nextLeaveRequests, nextAttendanceRecords, nextDocuments, nextPunchActivity, nextUploadedAssets] = await Promise.all([
          fetchResourceRows("/api/employees", "employees"),
          fetchResourceRows("/api/leave-requests", "leaveRequests"),
          fetchResourceRows("/api/attendance-records", "attendanceRecords"),
          fetchResourceRows("/api/documents", "documents"),
          fetchPunchActivityRows(),
          fetchResourceRows("/api/uploads?module=Employee", "uploads")
        ]);

        if (cancelled) return;

        setEmployees(nextEmployees);
        setLeaveRequests(nextLeaveRequests);
        setAttendanceRecords(nextAttendanceRecords);
        setDocuments(nextDocuments);
        setPunchActivityRecords(nextPunchActivity);
        setUploadedAssets(nextUploadedAssets);
      } catch (error) {
        console.error("Unable to refresh HRMS resources.", error);
      }
    }

    refreshHrmsResources();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!openEmployeeActionId) {
      return;
    }

    const closeEmployeeActions = () => setOpenEmployeeActionId(null);

    window.addEventListener("click", closeEmployeeActions);

    return () => {
      window.removeEventListener("click", closeEmployeeActions);
    };
  }, [openEmployeeActionId]);

  useEffect(() => {
    const syncQuickAttendance = () => {
      setQuickAttendance(buildQuickAttendanceDashboard(sortEmployeesById(employees), punchActivityRecords));
    };

    syncQuickAttendance();
    window.addEventListener("storage", syncQuickAttendance);
    window.addEventListener("focus", syncQuickAttendance);

    const refreshTimer = window.setInterval(syncQuickAttendance, 30000);

    return () => {
      window.removeEventListener("storage", syncQuickAttendance);
      window.removeEventListener("focus", syncQuickAttendance);
      window.clearInterval(refreshTimer);
    };
  }, [employees, punchActivityRecords]);

  useEffect(() => {
    let cancelled = false;

    async function refreshPunchActivity() {
      try {
        const rows = await fetchPunchActivityRows();

        if (!cancelled) {
          setPunchActivityRecords(rows);
        }
      } catch (error) {
        console.error("Unable to refresh punch activity.", error);
      }
    }

    window.addEventListener("focus", refreshPunchActivity);
    const timer = window.setInterval(refreshPunchActivity, 15000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshPunchActivity);
      window.clearInterval(timer);
    };
  }, []);

  const generateSalarySheet = () => {
    setSalarySheet(generateSalaryRows(sortedEmployees, attendanceRecords));
  };

  const downloadSalarySheet = () => {
    downloadCsv(`salary-sheet-${salarySheet.monthLabel || "current-month"}.csv`, salarySheet.rows);
  };

  const downloadSalarySlips = async () => {
    const path = "/api/pdf/salary-slips";
    const endpointUrl = apiUrl(path);
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: salarySheet.monthLabel,
        rows: salarySheet.rows
      })
    };
    let response;

    try {
      response = await fetch(endpointUrl, requestOptions);
    } catch (error) {
      if (endpointUrl === path) {
        throw error;
      }

      response = await fetch(path, requestOptions);
    }

    if (!response.ok) {
      throw new Error("Unable to generate salary slips.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `salary-slips-${salarySheet.monthLabel || "current-month"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareSalarySlips = async () => {
    setIsSharingPayslips(true);
    setShareSummary(null);

    try {
      const path = "/api/pdf/share-salary-slips";
      const endpointUrl = apiUrl(path);
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: salarySheet.monthLabel,
          rows: salarySheet.rows
        })
      };
      let response;

      try {
        response = await fetch(endpointUrl, requestOptions);
      } catch (error) {
        if (endpointUrl === path) {
          throw error;
        }

        response = await fetch(path, requestOptions);
      }

      if (!response.ok) {
        throw new Error("Unable to share salary slips.");
      }

      const result = await response.json();
      setShareSummary(result);
    } catch (error) {
      setShareSummary({
        sent: 0,
        skipped: 0,
        failed: salarySheet.rows.length,
        periodLabel: salarySheet.monthLabel,
        error: error?.message || "Unable to share salary slips."
      });
    } finally {
      setIsSharingPayslips(false);
    }
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
          <div className="employee-master-actions">
            <label className="employee-master-search">
              <span className="sr-only">Search employees</span>
              <input
                className="search-input"
                placeholder="Search"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
              />
            </label>
            <button className="mini-button" onClick={() => setAttendanceMasterEmployee(ALL_ATTENDANCE_MASTER)} type="button">
              Attendance Master
            </button>
            <button
              className="mini-button"
              onClick={() => {
                setEmployeeForm(createEmployeeFormState(getNextEmployeeCode(employees)));
                setEmployeeModalOpen(true);
              }}
              type="button"
            >
              Add Employee
            </button>
          </div>
        </div>
        <div className="quick-attendance-board">
          <div className="quick-attendance-head">
            <div>
              <p className="eyebrow">Today Punch Activity</p>
              <h4>Employee check-in and punch-out status</h4>
            </div>
            <span>{quickAttendance.dateLabel}</span>
          </div>
          <div className="quick-attendance-summary">
            <div className="quick-attendance-card">
              <span className="dot blue" />
              <strong>{visibleQuickAttendanceSummary.total}</strong>
              <small>Total Employees</small>
            </div>
            <div className="quick-attendance-card">
              <span className="dot green" />
              <strong>{visibleQuickAttendanceSummary.checkedIn}</strong>
              <small>Checked In</small>
            </div>
            <div className="quick-attendance-card">
              <span className="dot orange" />
              <strong>{visibleQuickAttendanceSummary.punchedOut}</strong>
              <small>Punched Out</small>
            </div>
            <div className="quick-attendance-card">
              <span className="dot red" />
              <strong>{visibleQuickAttendanceSummary.noPunch}</strong>
              <small>Not Yet</small>
            </div>
          </div>
          <div className="quick-attendance-table-wrap">
            <table className="data-table quick-attendance-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>First Punch</th>
                  <th>Last Punch</th>
                  <th>Total Working Hours</th>
                  <th>Total Break Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleQuickAttendanceRows.length ? visibleQuickAttendanceRows.map((row) => (
                  <tr
                    className="openable-row"
                    key={row.employeeId}
                    onClick={() => setAttendanceMasterEmployee(findEmployeeByAttendanceName(row.employeeId, employees))}
                  >
                    <td>{row.employeeId}</td>
                    <td>
                      <button
                        className="employee-name-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const selectedEmployee = findEmployeeByAttendanceName(row.employeeId, employees);

                          if (selectedEmployee) {
                            setAttendanceMasterEmployee(selectedEmployee);
                          }
                        }}
                        type="button"
                      >
                        {row.name}
                      </button>
                    </td>
                    <td>{row.department}</td>
                    <td>{row.designation}</td>
                    <td>
                      <button
                        className="punch-time-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAttendanceLogForRow(row);
                        }}
                        type="button"
                      >
                        {row.firstPunch}
                      </button>
                    </td>
                    <td>
                      <button
                        className="punch-time-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAttendanceLogForRow(row);
                        }}
                        type="button"
                      >
                        {row.lastPunch}
                      </button>
                    </td>
                    <td>{row.workingHours}</td>
                    <td>{row.breakHours}</td>
                    <td><StatusBadge tone={row.tone}>{row.status}</StatusBadge></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="9">{normalizedEmployeeSearch ? "No punch activity matches this search." : "No employee punch activity found for today."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="employee-table-head">
          <div>
            <p className="eyebrow">All Employees</p>
            <h4>Total Employees</h4>
          </div>
          <span>{normalizedEmployeeSearch ? `${visibleEmployees.length} of ${sortedEmployees.length}` : sortedEmployees.length}</span>
        </div>
        <div className="employee-master-table-wrap">
          <table className="data-table employee-master-table">
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
              {visibleEmployees.length ? visibleEmployees.map((employee) => (
                <tr className="openable-row" key={employee.id} onClick={() => setAttendanceMasterEmployee(employee)}>
                  <td>{employee.employeeId}</td>
                  <td>
                    <button
                      className="employee-name-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAttendanceMasterEmployee(employee);
                      }}
                      type="button"
                    >
                      {employee.name}
                    </button>
                  </td>
                  <td>{employee.department}</td>
                  <td>{employee.manager}</td>
                  <td>{employee.bankStatus}</td>
                  <td><StatusBadge tone={employee.tone}>{employee.status}</StatusBadge></td>
                  <td>
                    <div className="employee-action-menu-wrap" onClick={(event) => event.stopPropagation()}>
                      <button
                        aria-expanded={openEmployeeActionId === employee.id}
                        aria-label={`Actions for ${employee.name}`}
                        className="employee-action-trigger"
                        onClick={() => setOpenEmployeeActionId((current) => current === employee.id ? null : employee.id)}
                        type="button"
                      >
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                      </button>
                      {openEmployeeActionId === employee.id ? (
                        <div className="employee-action-menu" role="menu">
                          <button
                            onClick={() => {
                              setAttendanceMasterEmployee(employee);
                              setOpenEmployeeActionId(null);
                            }}
                            role="menuitem"
                            type="button"
                          >
                            Attendance
                          </button>
                          <button
                            onClick={() => {
                              setEmployeeDetail(employee);
                              setOpenEmployeeActionId(null);
                            }}
                            role="menuitem"
                            type="button"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => {
                              setEmployeeFormError("");
                              setEmployeeEdit(createEmployeeEditFormState(employee));
                              setOpenEmployeeActionId(null);
                            }}
                            role="menuitem"
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="danger-menu-item"
                            disabled={isPending}
                            onClick={() => {
                              setOpenEmployeeActionId(null);
                              startTransition(async () => {
                                await deleteEmployeeAction(employee.id);
                                setEmployees((current) => current.filter((item) => item.id !== employee.id));
                              });
                            }}
                            role="menuitem"
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7">{normalizedEmployeeSearch ? "No employees match this search." : "No employees added yet."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                <th>Salary Net Pay</th>
                <th>Month</th>
                <th>Days Worked</th>
                <th>Sunday</th>
                <th>Holidays</th>
                <th>Paid Leave</th>
                <th>OT Hours</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.employee}</td>
                  <td>{formatInr(record.salaryNetPay || findEmployeeNetPay(record.employee, employees))}</td>
                  <td>{formatMonthLabel(record.month)}</td>
                  <td>{record.present}</td>
                  <td>{record.sundays || calculateMonthMeta(record.month).sundays}</td>
                  <td>{record.holidays || 0}</td>
                  <td>{record.paidLeaves ?? record.leaves}</td>
                  <td>{record.otHours ?? record.overtime}</td>
                  <td><strong>{formatInr(calculateAttendancePay({
                    ...record,
                    salaryNetPay: record.salaryNetPay || findEmployeeNetPay(record.employee, employees)
                  }).totalPay)}</strong></td>
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
                  {!["accepted", "leave accepted"].includes(String(leave.status || "").trim().toLowerCase()) ? (
                    <button
                      className="mini-button"
                      disabled={isPending}
                      onClick={() => setLeaveToAccept(leave)}
                      type="button"
                    >
                      Accept
                    </button>
                  ) : null}
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
              <div className="row-actions">
                <button className="mini-button" onClick={downloadSalarySheet} type="button">
                  Download CSV
                </button>
                <button className="mini-button" disabled={isSharingPayslips} onClick={shareSalarySlips} type="button">
                  {isSharingPayslips ? "Sharing..." : "Share Salary Slip"}
                </button>
              </div>
            ) : null}
          </div>
          {salarySheet.rows.length ? (
            <>
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
              <div className="salary-sheet-actions">
                <button className="primary-button" onClick={downloadSalarySlips} type="button">
                  Download Salary Slip
                </button>
              </div>
              {shareSummary ? (
                <p className="empty-state">
                  {shareSummary.stored || 0} payslip{shareSummary.stored === 1 ? "" : "s"} shared for {shareSummary.periodLabel}.
                  {` ${shareSummary.sent} email${shareSummary.sent === 1 ? "" : "s"} sent.`}
                  {shareSummary.skipped ? ` ${shareSummary.skipped} skipped because registered email is missing.` : ""}
                  {shareSummary.failed ? ` ${shareSummary.failed} failed.` : ""}
                  {shareSummary.error ? ` ${shareSummary.error}` : ""}
                </p>
              ) : null}
            </>
          ) : (
            <p className="empty-state">No salary rows generated. Add matching employees in Employee Master and Monthly Attendance first.</p>
          )}
        </section>
      ) : null}

      <EmployeeCreateDrawer
        open={employeeModalOpen}
        state={employeeForm}
        setState={setEmployeeForm}
        error={employeeFormError}
        isPending={isPending}
        suggestedEmployeeCode={getNextEmployeeCode(employees)}
        onClose={() => {
          setEmployeeFormError("");
          setEmployeeModalOpen(false);
        }}
        onSubmit={() =>
          startTransition(async () => {
            setEmployeeFormError("");

            try {
              if (hasDuplicateEmployeeCode(employees, employeeForm.employeeCode)) {
                setEmployeeFormError("Employee Code already exists. Please use a different code.");
                return;
              }

              const created = await createEmployeeAction(toEmployeePayload(employeeForm));
              const { onboarding, ...employeeRecord } = created;
              const nextEmployees = [employeeRecord, ...employees];

              setEmployees((current) => [employeeRecord, ...current]);
              setEmployeeForm(createEmployeeFormState(getNextEmployeeCode(nextEmployees)));

              if (onboarding && !onboarding.emailSent) {
                setEmployeeFormError(`Employee saved in Employee Master, but welcome email was not sent: ${onboarding.reason || "Email delivery failed."}`);
                return;
              }

              setEmployeeModalOpen(false);
            } catch (error) {
              setEmployeeFormError(error?.message || "Unable to save employee. Please check the details and try again.");
            }
          })
        }
      />

      <EmployeeDetailsModal
        employee={employeeDetail}
        uploadedAssets={uploadedAssets}
        onClose={() => setEmployeeDetail(null)}
      />

      <AttendanceMasterModal
        employee={attendanceMasterEmployee}
        employees={sortedEmployees}
        leaveRequests={leaveRequests}
        month={attendanceMasterMonth}
        onClose={() => setAttendanceMasterEmployee(null)}
        onOpenAttendanceLog={openAttendanceLog}
        punchActivityRecords={punchActivityRecords}
        records={attendanceRecords}
        setMonth={setAttendanceMasterMonth}
      />

      <AttendanceLogModal
        employee={attendanceLogEmployee}
        initialDate={attendanceLogDate}
        onClose={() => setAttendanceLogEmployee(null)}
        onSave={(savedRows) => {
          setPunchActivityRecords((current) => mergeSavedPunchActivity(current, savedRows));
          setAttendanceLogEmployee(null);
        }}
        punchActivityRecords={punchActivityRecords}
      />

      <EmployeeCreateDrawer
        open={!!employeeEdit}
        title="Update Employee"
        state={employeeEdit}
        setState={setEmployeeEdit}
        error={employeeFormError}
        isPending={isPending}
        requireCoreFields={false}
        resetState={employeeEdit?.originalEmployee ? createEmployeeEditFormState(employeeEdit.originalEmployee) : null}
        submitLabel="Update"
        suggestedEmployeeCode={employeeEdit?.employeeCode || getNextEmployeeCode(employees)}
        onClose={() => {
          setEmployeeFormError("");
          setEmployeeEdit(null);
        }}
        onSubmit={() =>
          startTransition(async () => {
            setEmployeeFormError("");

            try {
              if (hasDuplicateEmployeeCode(employees, employeeEdit.employeeCode, employeeEdit.id)) {
                setEmployeeFormError("Employee Code already exists. Please use a different code.");
                return;
              }

              const updated = await updateEmployeeAction(employeeEdit.id, toEmployeePayload(employeeEdit));
              setEmployees((current) => current.map((item) => (item.id === updated.id ? updated : item)));
              setEmployeeEdit(null);
            } catch (error) {
              setEmployeeFormError(error?.message || "Unable to update employee. Please check the details and try again.");
            }
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
          ["reason", "Reason"],
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
          ["reason", "Reason"],
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

      <Modal
        open={!!leaveToAccept}
        title="Accept leave request"
        eyebrow="Leave approval"
        onClose={() => setLeaveToAccept(null)}
      >
        <div className="approval-confirm">
          <p>
            Confirm approval for <strong>{leaveToAccept?.employee}</strong>. An approval email will be sent to the employee.
          </p>
          <div className="approval-summary">
            <span>{leaveToAccept?.leaveType}</span>
            <strong>{leaveToAccept?.dates}</strong>
            <small>{leaveToAccept?.balance}</small>
            <div className="approval-reason">
              <span>Reason</span>
              <p>{leaveToAccept?.reason || "No reason provided"}</p>
            </div>
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setLeaveToAccept(null)} type="button">
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const updated = await updateLeaveRequestAction(leaveToAccept.id, {
                    ...leaveToAccept,
                    status: "Leave Accepted",
                    tone: "teal"
                  });
                  setLeaveRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                  setLeaveToAccept(null);
                })
              }
              type="button"
            >
              {isPending ? "Accepting..." : "Accept Leave"}
            </button>
          </div>
        </div>
      </Modal>

      <AttendanceModal
        open={attendanceModalOpen}
        title="Create Attendance Record"
        eyebrow="Attendance & T&A"
        state={attendanceForm}
        setState={setAttendanceForm}
        employees={employees}
        isPending={isPending}
        onClose={() => setAttendanceModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createAttendanceRecordAction(normalizeAttendancePayload(attendanceForm));
            setAttendanceRecords((current) => [created, ...current]);
            setAttendanceForm({ ...attendanceSeed, month: getMonthInputValue(new Date()) });
            setAttendanceModalOpen(false);
          })
        }
      />

      <AttendanceModal
        open={!!attendanceEdit}
        title="Update Attendance Record"
        eyebrow="Attendance & T&A"
        state={attendanceEdit}
        setState={setAttendanceEdit}
        employees={employees}
        isPending={isPending}
        onClose={() => setAttendanceEdit(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateAttendanceRecordAction(attendanceEdit.id, normalizeAttendancePayload(attendanceEdit));
            setAttendanceRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setAttendanceEdit(null);
          })
        }
      />
    </SuiteShell>
  );
}

function buildQuickAttendanceDashboard(employees, punchActivityRecords = []) {
  const now = new Date();
  const rows = employees.map((employee) => buildQuickAttendanceRow(employee, now, punchActivityRecords));

  return {
    dateLabel: formatAttendanceDate(now),
    rows,
    summary: {
      total: employees.length,
      checkedIn: rows.filter((row) => row.status === "Checked In").length,
      punchedOut: rows.filter((row) => row.status === "Punched Out").length,
      noPunch: rows.filter((row) => row.status === "Not Yet").length
    }
  };
}

function buildQuickAttendanceRow(employee, now, punchActivityRecords = []) {
  const activity = readEmployeePunchActivity(employee.employeeId, now, punchActivityRecords);
  const sortedActivity = sortPunchActivity(activity);
  const firstPunch = sortedActivity[0];
  const lastActivity = sortedActivity[sortedActivity.length - 1];
  const lastPunchOut = [...sortedActivity].reverse().find((entry) => entry.type === "Punch Out");
  const lastType = lastActivity?.type;
  const status = !lastActivity ? "Not Yet" : lastType === "Punch In" ? "Checked In" : "Punched Out";
  const tone = status === "Checked In" ? "teal" : status === "Punched Out" ? "gold" : "slate";

  return {
    employeeId: employee.employeeId || employee.id || "-",
    name: employee.name || "-",
    department: employee.department || "-",
    designation: employee.grade || getEmployeeDetailValue(employee, "designation") || "-",
    firstPunch: firstPunch ? formatPunchTime(firstPunch.timestamp) : "-",
    lastPunch: lastPunchOut ? formatPunchTime(lastPunchOut.timestamp) : "-",
    workingHours: sortedActivity.length ? formatDuration(calculatePunchWorkingSeconds(sortedActivity, now)) : "-",
    breakHours: sortedActivity.length ? formatDuration(calculatePunchBreakSeconds(sortedActivity, now)) : "-",
    status,
    tone
  };
}

function readEmployeePunchActivity(employeeId, date, punchActivityRecords = []) {
  if (!employeeId) {
    return [];
  }

  const dateKey = formatAttendanceStorageDate(date);
  const normalizedEmployeeId = String(employeeId).trim().toLowerCase();
  const databaseActivity = punchActivityRecords
    .filter((entry) =>
      String(entry.employeeId || "").trim().toLowerCase() === normalizedEmployeeId &&
      String(entry.workDate || "").trim() === dateKey
    )
    .map(normalizePunchActivityEntry);

  if (typeof window === "undefined") {
    return databaseActivity;
  }

  const storageKey = `talme-employee-phone-activity-${employeeId}-${dateKey}`;
  const sessionKey = `talme-employee-phone-session-${employeeId}-${dateKey}`;

  try {
    const storedActivity = window.localStorage.getItem(storageKey);
    const storedSession = window.localStorage.getItem(sessionKey);
    const parsedActivity = storedActivity ? JSON.parse(storedActivity) : [];
    const parsedSession = storedSession ? JSON.parse(storedSession) : null;
    const fallbackActivity = Array.isArray(parsedActivity) ? parsedActivity : [];
    const sessionActivity = buildPunchActivityFromSession(parsedSession, employeeId, dateKey);

    return mergePunchActivity([...databaseActivity, ...fallbackActivity, ...sessionActivity]);
  } catch {
    return databaseActivity;
  }
}

function normalizePunchActivityEntry(entry) {
  return {
    ...entry,
    type: entry.type,
    time: entry.time || formatPunchTime(entry.timestamp),
    timestamp: entry.timestamp || entry.createdAt
  };
}

function buildPunchActivityFromSession(session, employeeId, dateKey) {
  if (!session?.startAt) {
    return [];
  }

  const punchIn = {
    employeeId,
    type: "Punch In",
    timestamp: session.startAt,
    time: formatPunchTime(session.startAt),
    workDate: dateKey
  };

  if (!session.breakStartedAt) {
    return [punchIn];
  }

  return [
    punchIn,
    {
      employeeId,
      type: "Punch Out",
      timestamp: session.breakStartedAt,
      time: formatPunchTime(session.breakStartedAt),
      workDate: dateKey
    }
  ];
}

function getPunchActivityKey(entry = {}) {
  return [entry.employeeId || "", entry.workDate || "", entry.type || "", entry.timestamp || ""].join("|");
}

function mergePunchActivity(records = []) {
  const seen = new Set();

  return records
    .map(normalizePunchActivityEntry)
    .filter((entry) => {
      const key = getPunchActivityKey(entry);

      if (!entry.type || !entry.timestamp || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function mergeSavedPunchActivity(currentRows = [], savedRows = []) {
  const savedIds = new Set(savedRows.map((row) => row?.id).filter(Boolean).map(String));

  return mergePunchActivity([
    ...currentRows.filter((row) => !savedIds.has(String(row?.id || ""))),
    ...savedRows
  ]);
}

function sortPunchActivity(records = []) {
  return [...records].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
}

function calculatePunchWorkingSeconds(records, now) {
  let activePunchIn = null;
  let totalSeconds = 0;

  records.forEach((entry) => {
    if (entry.type === "Punch In") {
      activePunchIn = new Date(entry.timestamp);
      return;
    }

    if (entry.type === "Punch Out" && activePunchIn) {
      const punchOut = new Date(entry.timestamp);
      totalSeconds += Math.max(0, Math.floor((punchOut.getTime() - activePunchIn.getTime()) / 1000));
      activePunchIn = null;
    }
  });

  if (activePunchIn) {
    totalSeconds += Math.max(0, Math.floor((now.getTime() - activePunchIn.getTime()) / 1000));
  }

  return totalSeconds;
}

function calculatePunchBreakSeconds(records, now) {
  let totalSeconds = 0;

  records.forEach((entry, index) => {
    if (entry.type !== "Punch Out") {
      return;
    }

    const nextPunchIn = records.slice(index + 1).find((item) => item.type === "Punch In");
    const breakEnd = nextPunchIn ? new Date(nextPunchIn.timestamp) : now;
    const breakStart = new Date(entry.timestamp);

    totalSeconds += Math.max(0, Math.floor((breakEnd.getTime() - breakStart.getTime()) / 1000));
  });

  return totalSeconds;
}

function formatAttendanceStorageDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseAttendanceStorageDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function toTimeInputValue(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildManualPunchTimestamp(workDate, timeValue) {
  const [hours, minutes] = String(timeValue || "").split(":").map(Number);
  const date = parseAttendanceStorageDate(workDate);

  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toISOString();
}

function formatAttendanceDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatPunchTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (!hours && !minutes) {
    return "00h 00m";
  }

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function buildEmployeeAttendanceMasterRows(employee, month, punchActivityRecords = [], leaveRequests = []) {
  const { year, monthIndex } = parseMonthValue(month);
  const monthDays = new Date(year, monthIndex + 1, 0).getDate();
  const now = new Date();
  const rows = [];

  for (let day = monthDays; day >= 1; day -= 1) {
    const date = new Date(year, monthIndex, day);
    const isWeekOff = date.getDay() === 0;
    const isHoliday = !isWeekOff && isAcceptedLeaveDate(employee, date, leaveRequests);
    const activity = sortPunchActivity(readEmployeePunchActivity(employee.employeeId, date, punchActivityRecords));
    const punchIn = activity.find((entry) => entry.type === "Punch In");
    const punchOut = [...activity].reverse().find((entry) => entry.type === "Punch Out");
    const hasActivity = Boolean(activity.length);
    const absenceLabel = isWeekOff ? "Week Off" : isHoliday ? "Holiday" : null;

    rows.push({
      employeeId: employee.employeeId || employee.id || "-",
      name: employee.name || "-",
      department: employee.department || "-",
      designation: employee.grade || getEmployeeDetailValue(employee, "designation") || "-",
      date: formatAttendanceStorageDate(date),
      displayDate: formatAttendanceMasterDate(date),
      day: new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(date),
      isWeekOff,
      isHoliday,
      punchIn: absenceLabel || (punchIn ? formatPunchTime(punchIn.timestamp) : "-"),
      punchInGeo: absenceLabel || (punchIn ? formatPunchGeo(punchIn, employee) : "-"),
      punchOut: absenceLabel || (punchOut ? formatPunchTime(punchOut.timestamp) : "-"),
      punchOutGeo: absenceLabel || (punchOut ? formatPunchGeo(punchOut, employee) : "-"),
      workingHours: absenceLabel || (hasActivity ? formatDuration(calculateAttendanceMasterWorkingSeconds(activity, date, now)) : "-"),
      breakHours: absenceLabel || (hasActivity ? formatDuration(calculateAttendanceMasterBreakSeconds(activity)) : "-")
    });
  }

  return rows;
}

function isAcceptedLeaveDate(employee, date, leaveRequests = []) {
  const dateKey = formatAttendanceStorageDate(date);
  const employeeAliases = [
    employee?.employeeId,
    employee?.id,
    employee?.name,
    getEmployeeDetailValue(employee, "displayName"),
    getEmployeeDetailValue(employee, "employeeCode")
  ]
    .map(normalizeLookup)
    .filter(Boolean);

  return leaveRequests.some((leave) => {
    const status = normalizeLookup(leave.status);
    const leaveEmployee = normalizeLookup(leave.employee || leave.employeeId || leave.name);

    return (
      (status === "accepted" || status === "leave accepted" || status === "approved") &&
      employeeAliases.includes(leaveEmployee) &&
      isDateInsideLeaveDates(dateKey, leave.dates)
    );
  });
}

function isDateInsideLeaveDates(dateKey, dates) {
  const leaveDateKeys = String(dates || "")
    .match(/\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}/g)
    ?.map(normalizeLeaveDateKey)
    .filter(Boolean);

  if (!leaveDateKeys?.length) {
    return false;
  }

  let [startKey, endKey = startKey] = leaveDateKeys;

  if (startKey > endKey) {
    [startKey, endKey] = [endKey, startKey];
  }

  return dateKey >= startKey && dateKey <= endKey;
}

function normalizeLeaveDateKey(value) {
  const text = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) {
    return "";
  }

  const [, day, month, year] = match;

  return `${year}-${month}-${day}`;
}

function calculateAttendanceMasterWorkingSeconds(records, rowDate, now) {
  let activePunchIn = null;
  let totalSeconds = 0;
  const isToday = formatAttendanceStorageDate(rowDate) === formatAttendanceStorageDate(now);

  records.forEach((entry) => {
    if (entry.type === "Punch In") {
      activePunchIn = new Date(entry.timestamp);
      return;
    }

    if (entry.type === "Punch Out" && activePunchIn) {
      const punchOut = new Date(entry.timestamp);
      totalSeconds += Math.max(0, Math.floor((punchOut.getTime() - activePunchIn.getTime()) / 1000));
      activePunchIn = null;
    }
  });

  if (activePunchIn && isToday) {
    totalSeconds += Math.max(0, Math.floor((now.getTime() - activePunchIn.getTime()) / 1000));
  }

  return totalSeconds;
}

function calculateAttendanceMasterBreakSeconds(records) {
  let totalSeconds = 0;

  records.forEach((entry, index) => {
    if (entry.type !== "Punch Out") {
      return;
    }

    const nextPunchIn = records.slice(index + 1).find((item) => item.type === "Punch In");

    if (!nextPunchIn) {
      return;
    }

    const breakStart = new Date(entry.timestamp);
    const breakEnd = new Date(nextPunchIn.timestamp);

    totalSeconds += Math.max(0, Math.floor((breakEnd.getTime() - breakStart.getTime()) / 1000));
  });

  return totalSeconds;
}

function findEmployeeMonthAttendanceRecord(employee, month, records = []) {
  const employeeKeys = [employee?.name, employee?.employeeId].map(normalizeLookup);

  return records.find((record) =>
    record.month === month &&
    employeeKeys.includes(normalizeLookup(record.employee))
  );
}

function formatAttendanceMasterDate(date) {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear()
  ].join("-");
}

function formatPunchGeo(entry, employee) {
  const coordinates =
    entry.geoCoordinates ||
    entry.coordinates ||
    entry.geo ||
    entry.location ||
    entry.address;

  if (coordinates && typeof coordinates === "object") {
    const latitude = coordinates.latitude ?? coordinates.lat;
    const longitude = coordinates.longitude ?? coordinates.lng ?? coordinates.lon;

    if (latitude && longitude) {
      return `${latitude}, ${longitude}`;
    }

    return Object.values(coordinates).filter(Boolean).join(", ") || "-";
  }

  if (coordinates) {
    return String(coordinates);
  }

  const fallbackLocation =
    employee.location ||
    cleanDashValue(getEmployeeDetailValue(employee, "punchInBranch")) ||
    cleanDashValue(getEmployeeDetailValue(employee, "masterBranch"));

  return fallbackLocation || "-";
}

function cleanDashValue(value) {
  return value && value !== "-" ? value : "";
}

function toEmployeePayload(form) {
  const employeeName = form.employeeName || form.displayName || `Employee ${form.employeeCode}`;
  const location = form.punchInBranch || form.masterBranch || "Head Office";
  const monthlyCtc = form.approvedMonthlyCtc || form.salaryAmount;
  const salaryBand = [form.salaryType, monthlyCtc ? `INR ${monthlyCtc}` : ""].filter(Boolean).join(" - ");
  const employeeDetails = buildEmployeeDetails(form);

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
    salaryNetPay: Number(form.salaryNetPay) || 0,
    bankStatus: form.bankName || form.accountNo ? "Bank Added" : "Pending",
    status: form.status || "Active",
    tone: form.tone || "gold",
    employeeDetails
  };
}

function buildEmployeeDetails(form) {
  return {
    employeeCode: form.employeeCode,
    employeeName: form.employeeName,
    displayName: form.displayName,
    mobileNumber: [form.mobileCountry, form.mobileNumber].filter(Boolean).join(" "),
    email: form.email,
    gender: form.gender,
    punchInBranch: form.punchInBranch,
    masterBranch: form.masterBranch,
    department: form.department,
    designation: form.designation,
    employeeType: form.employeeType,
    doorLockPermission: form.doorLockPermission,
    salaryType: form.salaryType,
    salaryAmount: form.salaryAmount,
    approvedMonthlyCtc: form.approvedMonthlyCtc,
    salaryNetPay: form.salaryNetPay,
    payrollGroup: form.payrollGroup,
    uan: form.uan,
    esic: form.esic,
    address: form.address,
    bankName: form.bankName,
    branchName: form.branchName,
    accountNo: form.accountNo,
    ifscCode: form.ifscCode,
    aadharCard: form.legalDocuments?.aadharCard,
    drivingLicence: form.legalDocuments?.drivingLicence,
    panCard: form.legalDocuments?.panCard,
    passportSizePhoto: form.legalDocuments?.passportSizePhoto,
    emergencyNumber: [form.emergencyCountry, form.emergencyNumber].filter(Boolean).join(" "),
    emergencyPersonName: form.emergencyPersonName,
    emergencyRelation: form.emergencyRelation,
    emergencyAddress: form.emergencyAddress,
    dateOfBirth: form.dateOfBirth,
    dateOfJoining: form.dateOfJoining,
    referenceName: form.referenceName,
    referenceNumber: [form.referenceCountry, form.referenceNumber].filter(Boolean).join(" ")
  };
}

function getEmployeeDetailValue(employee, key) {
  const details = employee?.employeeDetails || {};
  const fallback = {
    employeeCode: employee?.employeeId,
    employeeName: employee?.name,
    email: employee?.email,
    department: employee?.department,
    designation: employee?.grade,
    dateOfJoining: employee?.joiningDate,
    salaryNetPay: employee?.salaryNetPay,
    bankName: employee?.bankStatus
  };

  return details[key] ?? fallback[key] ?? "-";
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

function getMonthInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthValue(value) {
  const [yearValue, monthValue] = String(value || getMonthInputValue(new Date())).split("-");
  const year = Number(yearValue) || new Date().getFullYear();
  const monthIndex = Math.max(0, Math.min(11, (Number(monthValue) || new Date().getMonth() + 1) - 1));

  return { year, monthIndex };
}

function calculateMonthMeta(value) {
  const { year, monthIndex } = parseMonthValue(value);
  const monthDays = new Date(year, monthIndex + 1, 0).getDate();

  return {
    monthDays,
    sundays: countSundays(year, monthIndex),
    label: new Date(year, monthIndex, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  };
}

function formatMonthLabel(value) {
  return calculateMonthMeta(value).label;
}

function findEmployeeByAttendanceName(employeeName, employees) {
  const normalizedName = normalizeLookup(employeeName);

  return employees.find((employee) =>
    normalizeLookup(employee.name) === normalizedName ||
    normalizeLookup(employee.employeeId) === normalizedName
  );
}

function findEmployeeNetPay(employeeName, employees) {
  const employee = findEmployeeByAttendanceName(employeeName, employees);

  if (!employee) {
    return 0;
  }

  if (Number(employee.salaryNetPay)) {
    return Number(employee.salaryNetPay);
  }

  return calculateMonthlyPayFromCtc(extractSalaryNumber(employee.salaryBand).annualCtc).monthlyNetPay;
}

function normalizeAttendancePayload(payload) {
  const meta = calculateMonthMeta(payload.month);
  const paidLeaves = Number(payload.paidLeaves ?? payload.leaves) || 0;
  const otHours = Number(payload.otHours ?? payload.overtime) || 0;

  return {
    ...payload,
    salaryNetPay: Number(payload.salaryNetPay) || 0,
    month: payload.month || getMonthInputValue(new Date()),
    monthDays: meta.monthDays,
    sundays: meta.sundays,
    holidays: Number(payload.holidays) || 0,
    paidLeaves,
    otHours,
    leaves: paidLeaves,
    overtime: otHours,
    shift: "Salary Net Pay",
    lockState: "Salary Ready",
    tone: "gold"
  };
}

function calculateAttendancePay(attendance) {
  const meta = calculateMonthMeta(attendance.month);
  const monthDays = Number(attendance.monthDays) || meta.monthDays;
  const salaryNetPay = Number(attendance.salaryNetPay) || 0;
  const presentDays = Number(attendance.present) || 0;
  const sundays = Number(attendance.sundays) || meta.sundays;
  const holidays = Number(attendance.holidays) || 0;
  const paidLeaves = Number(attendance.paidLeaves ?? attendance.leaves) || 0;
  const otHours = Number(attendance.otHours ?? attendance.overtime) || 0;
  const salaryDays = presentDays + sundays + holidays + paidLeaves;
  const perDayCost = monthDays ? salaryNetPay / monthDays : 0;
  const perHourCost = perDayCost / 8.5;
  const salaryExcludingOt = perDayCost * salaryDays;
  const otAmount = perHourCost * 1.5 * otHours;

  return {
    salaryNetPay,
    monthDays,
    presentDays,
    sundays,
    holidays,
    paidLeaves,
    otHours,
    salaryDays,
    perDayCost,
    perHourCost,
    salaryExcludingOt,
    otAmount,
    totalPay: salaryExcludingOt + otAmount,
    lopDays: Math.max(0, monthDays - salaryDays)
  };
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
  const defaultMonth = getMonthInputValue(today);
  const defaultMonthLabel = calculateMonthMeta(defaultMonth).label;
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
      const salaryNetPay = Number(attendance.salaryNetPay) || Number(employee.salaryNetPay) || monthlyNetPay;
      const month = attendance.month || defaultMonth;
      const monthLabel = calculateMonthMeta(month).label;
      const employeeDetails = employee.employeeDetails || {};
      const calculated = calculateAttendancePay({
        ...attendance,
        month,
        salaryNetPay
      });

      return {
        employeeId: employee.employeeId || employee.id,
        email: employee.email,
        name: employee.name,
        designation: employee.grade,
        department: employee.department,
        joiningDate: employee.joiningDate,
        pan: employeeDetails.panCard || "",
        uan: employeeDetails.uan || "",
        bankName: employeeDetails.bankName ||
          (/^(bank added|pending)$/i.test(employee.bankStatus || "") ? "" : employee.bankStatus),
        bankAccountNumber: employeeDetails.accountNo || "",
        monthlyCtc,
        monthlyNetPay: salaryNetPay,
        month: monthLabel,
        monthDays: calculated.monthDays,
        perDayCost: calculated.perDayCost,
        perHourCost: calculated.perHourCost,
        presentDays: calculated.presentDays,
        sundays: calculated.sundays,
        holidays: calculated.holidays,
        paidLeaves: calculated.paidLeaves,
        salaryDays: calculated.salaryDays,
        salaryExcludingOt: calculated.salaryExcludingOt,
        otHours: calculated.otHours,
        otAmount: calculated.otAmount,
        otApplicability: "1.5x",
        totalPay: calculated.totalPay,
        lopDays: calculated.lopDays
      };
    })
    .filter(Boolean);

  return {
    rows,
    generated: true,
    monthLabel: rows[0]?.month || defaultMonthLabel
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

function EmployeeCreateDrawer({
  open,
  state,
  setState,
  error,
  onSubmit,
  onClose,
  isPending,
  suggestedEmployeeCode,
  title = "Add Details",
  submitLabel = "Save",
  resetState = null,
  requireCoreFields = true
}) {
  const [openSections, setOpenSections] = useState({
    basic: true,
    bank: false,
    legal: false,
    emergency: false,
    personal: false,
    reference: false
  });

  useEffect(() => {
    if (open && state?.employeeCode === "37") {
      setState((current) => ({ ...current, employeeCode: suggestedEmployeeCode || employeeCreateSeed.employeeCode }));
    }
  }, [open, setState, state?.employeeCode, suggestedEmployeeCode]);

  if (!open || !state) return null;

  const update = (key) => (event) => {
    setState((current) => ({ ...current, [key]: event.target.value }));
  };
  const updateLegalDocument = (key) => async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isImage = file.type.startsWith("image/") || imageFilePattern.test(file.name);
    const previewUrl = isImage ? await readFileAsDataUrl(file) : "";
    let uploadedFile = null;

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("module", "Employee");
      body.append("owner", state.employeeName || state.displayName || state.employeeCode || "");
      body.append("label", key);

      const response = await fetch(apiUrl("/api/uploads"), { method: "POST", body });

      if (response.ok) {
        uploadedFile = await response.json();
      }
    } catch (error) {
      console.error("Unable to upload employee legal document.", error);
    }

    setState((current) => ({
      ...current,
      legalDocuments: {
        ...(current.legalDocuments || {}),
        [key]: {
          name: uploadedFile?.fileName || file.name,
          type: uploadedFile?.mimeType || file.type,
          fileUrl: uploadedFile?.fileUrl || "",
          url: uploadedFile?.fileUrl || previewUrl
        }
      }
    }));
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
            <h2 id="employee-drawer-title">{title}</h2>
            <button className="employee-close-button" onClick={onClose} type="button" aria-label="Close">
              x
            </button>
          </header>

          <div className="employee-accordion">
            {error ? <p className="employee-drawer-error">{error}</p> : null}

            <EmployeeSection title="Basic Details" open={openSections.basic} onToggle={() => toggle("basic")}>
              <div className="pooja-form-grid">
                <TextField label="Employee Code" required={requireCoreFields} value={state.employeeCode} onChange={update("employeeCode")} />
                <TextField label="Employee Name" required={requireCoreFields} placeholder="Enter Employee Name" value={state.employeeName} onChange={update("employeeName")} />
                <TextField label="Display Name" placeholder="Enter Display Name" value={state.displayName} onChange={update("displayName")} />
                <PhoneField label="Mobile Number" required={requireCoreFields} country={state.mobileCountry} number={state.mobileNumber} onCountryChange={update("mobileCountry")} onNumberChange={update("mobileNumber")} />
                <TextField label="Email" required={requireCoreFields} type="email" placeholder="Enter Employee Email" value={state.email} onChange={update("email")} />
                <RadioGroup label="Gender" required={requireCoreFields} name={`gender-${state.id || "new"}`} value={state.gender} options={["Male", "Female", "Other"]} onChange={update("gender")} />
                <SelectField label="Punch In Branch" required={requireCoreFields} allowManual placeholder="Select Branches" value={state.punchInBranch} onChange={update("punchInBranch")} options={["Main Branch", "Corporate Office", "Remote"]} />
                <SelectField label="Master Branch" required={requireCoreFields} allowManual placeholder="Select Master Branches" value={state.masterBranch} onChange={update("masterBranch")} options={["Main Branch", "Corporate Office", "Remote"]} />
                <SelectField label="Department" required={requireCoreFields} allowManual placeholder="Select/Create Department" value={state.department} onChange={update("department")} options={["HR", "Operations", "Finance", "Sales", "Technology"]} />
                <SelectField label="Designation" required={requireCoreFields} allowManual placeholder="Select/Create Designation" value={state.designation} onChange={update("designation")} options={["Associate", "Executive", "Manager", "Lead", "Admin"]} />
                <SelectField label="Employee Type" allowManual placeholder="Select Employee Type" value={state.employeeType} onChange={update("employeeType")} options={["Full Time", "Part Time", "Contract", "Intern"]} />
                <RadioGroup label="Door Lock Permission" required={requireCoreFields} name={`door-lock-${state.id || "new"}`} value={state.doorLockPermission} options={["Yes", "No"]} onChange={update("doorLockPermission")} />
                <RadioGroup label="Salary Type" required={requireCoreFields} name={`salary-type-${state.id || "new"}`} value={state.salaryType} options={["Monthly", "Hourly", "Compliance"]} onChange={update("salaryType")} />
                <TextField label="" type="number" value={state.salaryAmount} onChange={update("salaryAmount")} />
                <TextField label="Approved Monthly CTC" type="number" placeholder="Enter Approved Monthly CTC" value={state.approvedMonthlyCtc} onChange={update("approvedMonthlyCtc")} />
                <TextField label="Salary Net Pay" type="number" placeholder="Enter Monthly Net Pay" value={state.salaryNetPay} onChange={update("salaryNetPay")} />
                <SelectField label="Payroll Group" required={requireCoreFields} allowManual placeholder="Select Payroll Group" value={state.payrollGroup} onChange={update("payrollGroup")} options={["Default Payroll", "Staff Payroll", "Contract Payroll"]} />
                <TextField label="Universal Account Number (UAN)" placeholder="Enter 12-Digit UAN Number" value={state.uan} onChange={update("uan")} />
                <TextField label="Employee State Insurance Corporation (ESIC)" placeholder="Enter 10-Digit ESIC IP Number" value={state.esic} onChange={update("esic")} />
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
                <FileField label="Aadhar Card" fileName={state.legalDocuments?.aadharCard} onChange={updateLegalDocument("aadharCard")} />
                <FileField label="Driving Licence" fileName={state.legalDocuments?.drivingLicence} onChange={updateLegalDocument("drivingLicence")} />
                <FileField label="PAN Card" fileName={state.legalDocuments?.panCard} onChange={updateLegalDocument("panCard")} />
                <FileField label="Passport Size Photo" fileName={state.legalDocuments?.passportSizePhoto} onChange={updateLegalDocument("passportSizePhoto")} />
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
            <button className="pooja-secondary-button" type="button" onClick={() => setState(resetState || createEmployeeFormState(suggestedEmployeeCode))}>
              Reset
            </button>
            <button className="pooja-primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : submitLabel}
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

const manualSelectValue = "__manual__";

function SelectField({ label, required, placeholder, value, onChange, options, allowManual = false }) {
  const [manualEntry, setManualEntry] = useState(false);
  const hasCustomValue = allowManual && Boolean(value && !options.includes(value));
  const showManualInput = allowManual && (manualEntry || hasCustomValue);
  const selectValue = showManualInput ? manualSelectValue : value;

  const updateValue = (nextValue) => {
    onChange({ target: { value: nextValue } });
  };

  const handleSelectChange = (event) => {
    if (event.target.value === manualSelectValue) {
      setManualEntry(true);
      updateValue(hasCustomValue ? value : "");
      return;
    }

    setManualEntry(false);
    onChange(event);
  };

  return (
    <label className="pooja-field full-span">
      <span>{label}<RequiredMark required={required} /></span>
      <select required={required && !showManualInput} value={selectValue} onChange={handleSelectChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        {allowManual ? <option value={manualSelectValue}>+ Add manually</option> : null}
      </select>
      {showManualInput ? (
        <input
          autoFocus
          className="pooja-manual-input"
          placeholder={`Enter ${label}`}
          required={required}
          value={value}
          onChange={onChange}
        />
      ) : null}
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

function FileField({ label, fileName, onChange }) {
  const displayName = getDocumentName(fileName);

  return (
    <label className="pooja-file-field full-span">
      <span>{label}</span>
      <input type="file" onChange={onChange} />
      {displayName ? <small>{displayName}</small> : null}
    </label>
  );
}

function EmployeeDetailsModal({ employee, uploadedAssets = [], onClose }) {
  const [preview, setPreview] = useState(null);

  return (
    <>
      <Modal open={!!employee} eyebrow="Employee Master" title={employee?.name || "Employee Details"} onClose={onClose}>
        {employee ? (
          <div className="employee-detail-grid">
            {employeeDetailSections.map((section) => (
              <section className="employee-detail-section" key={section.title}>
                <h4>{section.title}</h4>
                <div className="doc-stack">
                  {section.fields.map(([key, label]) => {
                    const value = getEmployeeDetailValue(employee, key);
                    const displayValue = getDocumentName(value) || String(value || "-");
                    const canPreview = legalDocumentKeys.has(key) && isSavedDocumentValue(displayValue);

                    return (
                      <div className="doc-line" key={key}>
                        <span>{label}</span>
                        {canPreview ? (
                          <button
                            className="document-preview-button"
                            onClick={() => setPreview({
                              title: label,
                              name: displayValue,
                              src: getDocumentPreviewSrc(value, uploadedAssets, employee, label)
                            })}
                            type="button"
                          >
                            {displayValue}
                          </button>
                        ) : (
                          <strong>{displayValue}</strong>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </Modal>
      <ImagePreviewModal preview={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function ImagePreviewModal({ preview, onClose }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [preview?.src]);

  if (!preview) return null;

  return (
    <div className="image-preview-shell" role="presentation" onClick={onClose}>
      <div className="image-preview-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="image-preview-head">
          <div>
            <p className="eyebrow">{preview.title}</p>
            <h3>{preview.name}</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {preview.src && !failed ? (
          <img alt={preview.name} src={preview.src} onError={() => setFailed(true)} />
        ) : (
          <p className="empty-state">Image preview is not available for this saved filename.</p>
        )}
      </div>
    </div>
  );
}

function AttendanceLogModal({ employee, initialDate, onClose, onSave, punchActivityRecords = [] }) {
  const [logDate, setLogDate] = useState(() => formatAttendanceStorageDate(new Date()));
  const [punchInTime, setPunchInTime] = useState("");
  const [punchOutTime, setPunchOutTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setLogDate(initialDate || formatAttendanceStorageDate(new Date()));
      setError("");
    }
  }, [employee, initialDate]);

  useEffect(() => {
    if (!employee) {
      return;
    }

    const activity = sortPunchActivity(readEmployeePunchActivity(employee.employeeId, parseAttendanceStorageDate(logDate), punchActivityRecords));
    const firstPunchIn = activity.find((entry) => entry.type === "Punch In");
    const lastPunchOut = [...activity].reverse().find((entry) => entry.type === "Punch Out");

    setPunchInTime(firstPunchIn ? toTimeInputValue(firstPunchIn.timestamp) : "");
    setPunchOutTime(lastPunchOut ? toTimeInputValue(lastPunchOut.timestamp) : "");
  }, [employee, logDate, punchActivityRecords]);

  if (!employee) {
    return null;
  }

  const saveLog = async (event) => {
    event.preventDefault();
    setError("");

    if (!punchInTime && !punchOutTime) {
      setError("Enter punch in or punch out time.");
      return;
    }

    setIsSaving(true);

    try {
      const entries = [
        ["Punch In", punchInTime],
        ["Punch Out", punchOutTime]
      ].filter(([, timeValue]) => timeValue);
      const savedRows = await Promise.all(entries.map(([type, timeValue]) => {
        const timestamp = buildManualPunchTimestamp(logDate, timeValue);

        return postManualPunchActivity({
          employeeId: employee.employeeId,
          employeeName: employee.name,
          type,
          timestamp,
          time: formatPunchTime(timestamp).toLowerCase(),
          workDate: logDate,
          geoCoordinates: employee.location || getEmployeeDetailValue(employee, "punchInBranch") || getEmployeeDetailValue(employee, "masterBranch") || undefined
        });
      }));

      onSave(savedRows);
    } catch (saveError) {
      setError(saveError?.message || "Unable to save attendance log.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={!!employee} eyebrow="Attendance Log" title={`${employee.employeeId || "-"} - ${employee.name || "-"}`} onClose={onClose}>
      <form className="attendance-log-form" onSubmit={saveLog}>
        <label>
          <span>Date</span>
          <input type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} />
        </label>
        <div className="attendance-log-row">
          <strong>In</strong>
          <input type="time" value={punchInTime} onChange={(event) => setPunchInTime(event.target.value)} />
        </div>
        <div className="attendance-log-row">
          <strong>Out</strong>
          <input type="time" value={punchOutTime} onChange={(event) => setPunchOutTime(event.target.value)} />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save Time"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AttendanceMasterModal({ employee, employees = [], leaveRequests = [], month, onClose, onOpenAttendanceLog, punchActivityRecords = [], records, setMonth }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const isAllEmployees = employee === ALL_ATTENDANCE_MASTER;
  const masterEmployees = isAllEmployees ? employees : employee ? [employee] : [];
  const rows = masterEmployees.flatMap((item) => buildEmployeeAttendanceMasterRows(item, month, punchActivityRecords, leaveRequests));
  const monthRecords = masterEmployees
    .map((item) => findEmployeeMonthAttendanceRecord(item, month, records))
    .filter(Boolean);
  const monthRecord = !isAllEmployees && monthRecords.length ? monthRecords[0] : null;
  const summary = isAllEmployees
    ? monthRecords.reduce((total, record) => ({
        presentDays: total.presentDays + (Number(record.present) || 0),
        paidLeave: total.paidLeave + (Number(record.paidLeaves ?? record.leaves) || 0),
        otHours: total.otHours + (Number(record.otHours ?? record.overtime) || 0)
      }), { presentDays: 0, paidLeave: 0, otHours: 0 })
    : {
        presentDays: monthRecord?.present || 0,
        paidLeave: monthRecord?.paidLeaves ?? monthRecord?.leaves ?? 0,
        otHours: monthRecord?.otHours ?? monthRecord?.overtime ?? 0
      };
  const masterTitle = isAllEmployees ? "All Employees" : employee?.name;
  const masterHeader = isAllEmployees
    ? {
        employeeId: "All Employees",
        name: "All Employees",
        department: "All Departments",
        designation: "Combined Monthly Sheet"
      }
    : {
        employeeId: employee?.employeeId,
        name: employee?.name,
        department: employee?.department,
        designation: employee?.grade || getEmployeeDetailValue(employee, "designation")
      };
  const monthLabel = formatMonthLabel(month);

  if (!employee) {
    return null;
  }

  const openLogForMasterRow = (row) => {
    const selectedEmployee = masterEmployees.find((item) =>
      normalizeLookup(item.employeeId) === normalizeLookup(row.employeeId) ||
      normalizeLookup(item.name) === normalizeLookup(row.name)
    );

    onOpenAttendanceLog?.(selectedEmployee, row.date);
  };

  const downloadPdf = async () => {
    setIsDownloading(true);

    try {
      const path = "/api/pdf/attendance-master";
      const endpointUrl = apiUrl(path);
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee: masterHeader,
          monthLabel,
          summary,
          rows
        })
      };
      let response;

      try {
        response = await fetch(endpointUrl, requestOptions);
      } catch (error) {
        if (endpointUrl === path) {
          throw error;
        }

        response = await fetch(path, requestOptions);
      }

      if (!response.ok && endpointUrl !== path) {
        response = await fetch(path, requestOptions);
      }

      if (!response.ok) {
        throw new Error("Unable to download Attendance Master PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `attendance-master-${isAllEmployees ? "all-employees" : employee.employeeId || employee.name || "employee"}-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="attendance-master-screen" role="dialog" aria-modal="true" aria-label="Attendance Master">
      <div className="attendance-master-topbar">
        <button className="ghost-button" onClick={onClose} type="button">
          <span aria-hidden="true">{"<"}</span>
          Back
        </button>
        <div>
          <p className="eyebrow">Attendance Master</p>
          <h2>{masterTitle}</h2>
        </div>
        <button className="primary-button" disabled={isDownloading} onClick={downloadPdf} type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" />
          </svg>
          {isDownloading ? "Downloading..." : "Download PDF"}
        </button>
      </div>

      <div className="attendance-master-fullbody">
        <div className="attendance-master-view">
          <header className="attendance-master-brand">
            <img src="/talme-logo.png" alt="Talme Technologies Pvt Ltd" />
            <div>
              <h2>Talme HRMS Suite</h2>
              <h3>Attendance Master</h3>
            </div>
          </header>

          <div className="attendance-master-toolbar">
            <div>
              <strong>{masterHeader.employeeId}</strong>
              <span>{masterHeader.name} - {masterHeader.department || "-"} - {masterHeader.designation || "-"}</span>
            </div>
            <label>
              <span>Month</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
          </div>

          <div className="attendance-master-summary">
            <div><strong>{monthLabel}</strong><small>Attendance period</small></div>
            <div><strong>{summary.presentDays}</strong><small>Present days</small></div>
            <div><strong>{summary.paidLeave}</strong><small>Paid leave</small></div>
            <div><strong>{summary.otHours}</strong><small>OT hours</small></div>
          </div>

          <div className="attendance-master-table-wrap">
            <table className="attendance-master-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Punch In</th>
                  <th>Geo Coordinates<br />(After Punch In)</th>
                  <th>Punch Out</th>
                  <th>Geo Coordinates<br />(After Punch Out)</th>
                  <th>Total Working Hours</th>
                  <th>Total Break</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className={row.isWeekOff || row.isHoliday ? "attendance-absence-row" : undefined} key={`${row.employeeId}-${row.date}`}>
                    <td>{row.employeeId}</td>
                    <td>{row.name}</td>
                    <td>{row.department}</td>
                    <td>{row.designation}</td>
                    <td>{row.displayDate}</td>
                    <td>{row.day}</td>
                    <td>
                      {row.isWeekOff || row.isHoliday ? (
                        <span className="absence-label">{row.punchIn}</span>
                      ) : (
                        <button
                          className="punch-time-button"
                          onClick={() => openLogForMasterRow(row)}
                          type="button"
                        >
                          {row.punchIn}
                        </button>
                      )}
                    </td>
                    <td>{row.punchInGeo}</td>
                    <td>
                      {row.isWeekOff || row.isHoliday ? (
                        <span className="absence-label">{row.punchOut}</span>
                      ) : (
                        <button
                          className="punch-time-button"
                          onClick={() => openLogForMasterRow(row)}
                          type="button"
                        >
                          {row.punchOut}
                        </button>
                      )}
                    </td>
                    <td>{row.punchOutGeo}</td>
                    <td>{row.workingHours}</td>
                    <td>{row.breakHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
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

function AttendanceModal({ open, title, eyebrow, state, setState, onSubmit, onClose, isPending, employees }) {
  useEffect(() => {
    if (!open || !state) return;

    const meta = calculateMonthMeta(state.month);
    const employeeNetPay = findEmployeeNetPay(state.employee, employees);

    setState((current) => {
      if (!current) return current;

      const nextSalaryNetPay = current.salaryNetPay || (employeeNetPay ? String(Math.round(employeeNetPay)) : "");

      if (
        String(current.monthDays || "") === String(meta.monthDays) &&
        String(current.sundays || "") === String(meta.sundays) &&
        String(current.salaryNetPay || "") === String(nextSalaryNetPay)
      ) {
        return current;
      }

      return {
        ...current,
        monthDays: meta.monthDays,
        sundays: meta.sundays,
        salaryNetPay: nextSalaryNetPay
      };
    });
  }, [employees, open, setState, state]);

  if (!open || !state) return null;

  const update = (key) => (event) => {
    const value = event.target.value;

    setState((current) => {
      const next = { ...current, [key]: value };

      if (key === "employee") {
        const netPay = findEmployeeNetPay(value, employees);
        if (netPay) {
          next.salaryNetPay = String(Math.round(netPay));
        }
      }

      if (key === "month") {
        const meta = calculateMonthMeta(value);
        next.monthDays = meta.monthDays;
        next.sundays = meta.sundays;
      }

      return next;
    });
  };

  const normalized = normalizeAttendancePayload(state);
  const calculated = calculateAttendancePay(normalized);

  return (
    <Modal open={open} eyebrow={eyebrow} title={title} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="form-grid">
          <label>
            <span>Employee</span>
            <input list="attendance-employees" value={state.employee ?? ""} onChange={update("employee")} />
            <datalist id="attendance-employees">
              {sortEmployeesById(employees).map((employee) => (
                <option key={employee.id} value={employee.name}>
                  {employee.employeeId}
                </option>
              ))}
            </datalist>
          </label>
          <label>
            <span>Salary Net Pay</span>
            <input type="number" min="0" step="0.01" value={state.salaryNetPay ?? ""} onChange={update("salaryNetPay")} />
          </label>
          <label>
            <span>Month</span>
            <input type="month" value={state.month || getMonthInputValue(new Date())} onChange={update("month")} />
          </label>
          <label>
            <span>No. Of Days</span>
            <input readOnly value={calculated.monthDays} />
          </label>
          <label>
            <span>No of days worked</span>
            <input type="number" min="0" step="1" value={state.present ?? ""} onChange={update("present")} />
          </label>
          <label>
            <span>Sunday</span>
            <input readOnly value={calculated.sundays} />
          </label>
          <label>
            <span>Holidays</span>
            <input type="number" min="0" step="1" value={state.holidays ?? ""} onChange={update("holidays")} />
          </label>
          <label>
            <span>Paid leaves</span>
            <input type="number" min="0" step="1" value={state.paidLeaves ?? state.leaves ?? ""} onChange={update("paidLeaves")} />
          </label>
          <label>
            <span>OT Hours</span>
            <input type="number" min="0" step="0.5" value={state.otHours ?? state.overtime ?? ""} onChange={update("otHours")} />
          </label>
          <label>
            <span>Total Working days for salary</span>
            <input readOnly value={formatNumber(calculated.salaryDays)} />
          </label>
          <label>
            <span>Salary Excluding OT</span>
            <input readOnly value={Math.round(calculated.salaryExcludingOt)} />
          </label>
          <label>
            <span>Total</span>
            <input readOnly value={Math.round(calculated.totalPay)} />
          </label>
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
    </Modal>
  );
}
