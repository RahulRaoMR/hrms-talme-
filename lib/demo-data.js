export const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    meta: "Executive overview",
    index: "01"
  },
  {
    href: "/hrms",
    label: "Employees",
    meta: "Staff and lifecycle",
    index: "02"
  },
  {
    href: "/ats",
    label: "ATS",
    meta: "Recruitment pipeline",
    index: "03"
  },
  {
    href: "/vms",
    label: "VMS",
    meta: "Vendor operations",
    index: "04"
  },
  {
    href: "/shifts",
    label: "Manage Shifts",
    meta: "Scheduling and rotations",
    index: "05"
  },
  {
    href: "/leaves",
    label: "Leaves & Holidays",
    meta: "Absence management",
    index: "06"
  },
  {
    href: "/payroll",
    label: "Payroll",
    meta: "Tax and salary payment",
    index: "07"
  },
  {
    href: "/recruitment",
    label: "Recruitment",
    meta: "Job openings and hiring",
    index: "08"
  },
  {
    href: "/approvals",
    label: "Approvals",
    meta: "Inbox and sign-offs",
    index: "09"
  },
  {
    href: "/reports",
    label: "Reports",
    meta: "Analytics and AI",
    index: "10"
  },
  {
    href: "/dynamic-reports",
    label: "Dynamic Reports",
    meta: "Custom analytics",
    index: "11"
  },
  {
    href: "/documents",
    label: "Documents",
    meta: "KYC and compliance",
    index: "12"
  },
  {
    href: "/loans",
    label: "Loan & Arrears",
    meta: "Financial assistance",
    index: "13"
  },
  {
    href: "/settings",
    label: "Settings",
    meta: "Company rules",
    index: "14"
  },
  {
    href: "/employee-portal",
    label: "Employee Portal",
    meta: "Self service",
    index: "15"
  },
  {
    href: "/employee-app",
    label: "Employee App",
    meta: "Mobile self service",
    index: "16"
  },
  {
    href: "/vendor-portal",
    label: "Vendor Portal",
    meta: "Supplier workspace",
    index: "17"
  },
  {
    href: "/search",
    label: "Search",
    meta: "Global lookup",
    index: "18"
  },
  {
    href: "/exports",
    label: "Exports",
    meta: "CSV and PDF center",
    index: "19"
  },
  {
    href: "/notifications",
    label: "Notifications",
    meta: "Communication hub",
    index: "20"
  },
  {
    href: "/users",
    label: "Users",
    meta: "Access management",
    index: "21"
  },
  {
    href: "/activity",
    label: "Activity",
    meta: "Audit history",
    index: "22"
  }
];

export const storeKeys = {
  candidates: "talme-candidates",
  vendors: "talme-vendors",
  invoices: "talme-invoices"
};

export const employeeMasterSeed = [
  {
    employeeId: "TLM-2048",
    email: "manish.gupta@talme.ai",
    name: "Manish Gupta",
    department: "Workforce Operations",
    location: "Pune Plant",
    manager: "Ritika Nair",
    grade: "L3",
    joiningDate: "2023-07-14",
    salaryBand: "INR 9.6L",
    bankStatus: "Verified",
    status: "Confirmed",
    tone: "teal"
  },
  {
    employeeId: "TLM-2091",
    email: "priya.sinha@talme.ai",
    name: "Priya Sinha",
    department: "Payroll",
    location: "Mumbai HO",
    manager: "Dev Arora",
    grade: "L2",
    joiningDate: "2024-01-08",
    salaryBand: "INR 7.2L",
    bankStatus: "Pending",
    status: "Probation",
    tone: "gold"
  },
  {
    employeeId: "TLM-2117",
    email: "karan.das@talme.ai",
    name: "Karan Das",
    department: "Security Ops",
    location: "Nashik Site",
    manager: "Ritika Nair",
    grade: "L4",
    joiningDate: "2022-11-21",
    salaryBand: "INR 11.4L",
    bankStatus: "Verified",
    status: "Confirmed",
    tone: "teal"
  }
];

export const leaveSeed = [
  {
    employee: "Priya Sinha",
    leaveType: "Earned Leave",
    dates: "Apr 24 - Apr 26",
    balance: "8.5 days",
    approver: "Dev Arora",
    status: "Manager Review",
    tone: "gold"
  },
  {
    employee: "Manish Gupta",
    leaveType: "Sick Leave",
    dates: "Apr 18",
    balance: "5 days",
    approver: "Ritika Nair",
    status: "Approved",
    tone: "teal"
  }
];

export const attendanceSeed = [
  {
    employee: "Manish Gupta",
    present: 24,
    leaves: 1,
    overtime: 8,
    shift: "A",
    lockState: "Closed",
    tone: "teal"
  },
  {
    employee: "Priya Sinha",
    present: 22,
    leaves: 2,
    overtime: 4,
    shift: "B",
    lockState: "Review",
    tone: "gold"
  },
  {
    employee: "Karan Das",
    present: 26,
    leaves: 0,
    overtime: 12,
    shift: "General",
    lockState: "Approved",
    tone: "teal"
  }
];

export const vendorWorkerSeed = [
  {
    workerId: "VW-8801",
    name: "Ramesh Pawar",
    vendor: "SecureAxis Services",
    site: "Pune Plant",
    skill: "Security Guard",
    wageRate: "INR 785/day",
    attendance: "25/26",
    status: "Active",
    tone: "teal"
  },
  {
    workerId: "VW-8844",
    name: "Farida Khan",
    vendor: "FreshServe Foods",
    site: "Mumbai HO",
    skill: "Canteen Supervisor",
    wageRate: "INR 950/day",
    attendance: "24/26",
    status: "Docs Review",
    tone: "gold"
  }
];

export const documentSeed = [
  {
    owner: "Manish Gupta",
    docType: "PAN + Aadhaar",
    module: "Employee",
    expiry: "No expiry",
    status: "Verified",
    tone: "teal"
  },
  {
    owner: "SecureAxis Services",
    docType: "PF Challan",
    module: "Vendor",
    expiry: "Apr 30, 2026",
    status: "Expiring",
    tone: "gold"
  },
  {
    owner: "INV-1293",
    docType: "Attendance Sheet",
    module: "Payroll",
    expiry: "Monthly",
    status: "Pending",
    tone: "slate"
  }
];

export const approvalSeed = [
  {
    module: "Leave",
    title: "Earned Leave Approval",
    owner: "Priya Sinha",
    amount: "2 days",
    level: "Manager",
    status: "Pending",
    tone: "gold"
  },
  {
    module: "Payroll",
    title: "Bank Advice Release",
    owner: "April Payroll",
    amount: "INR 1.82 Cr",
    level: "Finance",
    status: "Ready",
    tone: "teal"
  },
  {
    module: "VMS",
    title: "Vendor Invoice Approval",
    owner: "SecureAxis Services",
    amount: "INR 18,70,000",
    level: "Finance",
    status: "Review",
    tone: "gold"
  }
];

export const settingSeed = [
  { category: "Payroll", name: "PF Employer Share", value: "12%", status: "Active" },
  { category: "Leave", name: "Annual Earned Leave", value: "18 days", status: "Active" },
  { category: "Attendance", name: "Late Grace", value: "10 minutes", status: "Active" },
  { category: "Approval", name: "Invoice Threshold", value: "INR 5,00,000", status: "Finance required" }
];

export const uploadedAssetSeed = [
  {
    module: "Employee",
    owner: "Manish Gupta",
    label: "Payslip April 2026",
    fileName: "payslip-apr-2026.pdf",
    fileUrl: "/uploads/demo/payslip-apr-2026.pdf",
    mimeType: "application/pdf",
    sizeLabel: "248 KB",
    status: "Available"
  },
  {
    module: "Vendor",
    owner: "SecureAxis Services",
    label: "PF Challan",
    fileName: "secureaxis-pf-challan.pdf",
    fileUrl: "/uploads/demo/secureaxis-pf-challan.pdf",
    mimeType: "application/pdf",
    sizeLabel: "332 KB",
    status: "Verified"
  },
  {
    module: "ATS",
    owner: "Neha Sharma",
    label: "Resume",
    fileName: "neha-sharma-resume.pdf",
    fileUrl: "/uploads/demo/neha-sharma-resume.pdf",
    mimeType: "application/pdf",
    sizeLabel: "196 KB",
    status: "Screened"
  }
];

export const notificationSeed = [
  {
    subject: "Payroll Release Ready",
    audience: "Finance + HR + Site Managers",
    recipients: "finance@talme.ai, hr@talme.ai",
    channel: "Email, WhatsApp",
    message: "April payroll has cleared attendance validation and is ready for final release.",
    status: "Sent",
    tone: "teal"
  },
  {
    subject: "Vendor KYC Expiry Alert",
    audience: "Vendors + Compliance",
    recipients: "compliance@talme.ai, +919999999999",
    channel: "Email, SMS, Dashboard",
    message: "SecureAxis Services PF challan expires this month and needs upload before payment release.",
    status: "Queued",
    tone: "gold"
  },
  {
    subject: "Interview Panel Update",
    audience: "Recruiters + Interviewers",
    recipients: "recruitment@talme.ai",
    channel: "Email, Dashboard",
    message: "Final interview panel updated for Plant HR Manager requisition.",
    status: "Draft",
    tone: "slate"
  }
];

export const demoSeed = {
  candidates: [
    {
      name: "Neha Sharma",
      email: "neha.sharma@talme.ai",
      role: "HRBP",
      stage: "Final Interview",
      source: "Direct ATS",
      label: "Pending",
      tone: "gold"
    },
    {
      name: "Arjun Menon",
      email: "arjun.menon@talme.ai",
      role: "Security Lead",
      stage: "Offer",
      source: "Staffing Vendor",
      label: "Approved",
      tone: "teal"
    },
    {
      name: "Sonal Rao",
      email: "sonal.rao@talme.ai",
      role: "Payroll Analyst",
      stage: "Assessment",
      source: "Referral",
      label: "Review",
      tone: "slate"
    }
  ],
  vendors: [
    {
      vendor: "StaffCore India",
      category: "Staffing",
      sites: "8",
      rating: "4.8",
      label: "Active",
      tone: "teal"
    },
    {
      vendor: "MoveFleet Logistics",
      category: "Transport",
      sites: "3",
      rating: "4.5",
      label: "Review",
      tone: "gold"
    },
    {
      vendor: "FreshServe Foods",
      category: "Canteen",
      sites: "5",
      rating: "4.6",
      label: "Active",
      tone: "teal"
    },
    {
      vendor: "SecureAxis Services",
      category: "Security",
      sites: "4",
      rating: "4.7",
      label: "Active",
      tone: "teal"
    }
  ],
  invoices: [
    {
      vendor: "StaffCore India",
      invoiceNo: "INV-4388",
      attendance: "March closed",
      amount: "INR 42,40,000",
      label: "Approved",
      tone: "teal"
    },
    {
      vendor: "SecureAxis Services",
      invoiceNo: "INV-1293",
      attendance: "March closed",
      amount: "INR 18,70,000",
      label: "Finance Review",
      tone: "gold"
    },
    {
      vendor: "MoveFleet Logistics",
      invoiceNo: "INV-9902",
      attendance: "March closed",
      amount: "INR 9,25,000",
      label: "Pending Docs",
      tone: "slate"
    }
  ]
};

export const dashboardMetrics = [
  { label: "Open Requisitions", value: "148", meta: "12 added this week" },
  { label: "Active Vendors", value: "24", meta: "7 service categories" },
  { label: "Attendance Accuracy", value: "99.2%", meta: "Monthly sheet locked" },
  { label: "Payroll Release", value: "Apr 26", meta: "Tax validation complete" }
];

export const dashboardChartSets = {
  "30D": {
    hiring: {
      summary: "82%",
      items: [
        { label: "W1", value: "12", height: 42 },
        { label: "W2", value: "18", height: 56 },
        { label: "W3", value: "24", height: 68 },
        { label: "W4", value: "28", height: 74 },
        { label: "W5", value: "31", height: 82 }
      ]
    },
    vendor: {
      summary: "4.7",
      items: [
        { label: "Staffing", value: "4.8", height: 88 },
        { label: "Transport", value: "4.5", height: 78 },
        { label: "Canteen", value: "4.6", height: 80 },
        { label: "Security", value: "4.7", height: 82 },
        { label: "Housekeeping", value: "4.4", height: 76 }
      ]
    }
  },
  QTD: {
    hiring: {
      summary: "89%",
      items: [
        { label: "Jan", value: "22", height: 56 },
        { label: "Feb", value: "26", height: 68 },
        { label: "Mar", value: "29", height: 74 },
        { label: "Apr", value: "34", height: 82 },
        { label: "May", value: "38", height: 89 }
      ]
    },
    vendor: {
      summary: "4.8",
      items: [
        { label: "Staffing", value: "4.9", height: 92 },
        { label: "Transport", value: "4.6", height: 80 },
        { label: "Canteen", value: "4.7", height: 84 },
        { label: "Security", value: "4.8", height: 88 },
        { label: "Housekeeping", value: "4.5", height: 78 }
      ]
    }
  },
  YTD: {
    hiring: {
      summary: "91%",
      items: [
        { label: "Q1", value: "64", height: 66 },
        { label: "Q2", value: "82", height: 84 },
        { label: "Q3", value: "88", height: 89 },
        { label: "Q4", value: "92", height: 92 },
        { label: "FY", value: "96", height: 96 }
      ]
    },
    vendor: {
      summary: "4.8",
      items: [
        { label: "Staffing", value: "4.9", height: 94 },
        { label: "Transport", value: "4.7", height: 86 },
        { label: "Canteen", value: "4.8", height: 88 },
        { label: "Security", value: "4.8", height: 90 },
        { label: "Housekeeping", value: "4.6", height: 82 }
      ]
    }
  }
};

export const payrollChartSets = {
  Monthly: {
    disbursement: {
      summary: "96%",
      items: [
        { label: "Jan", value: "91%", height: 64 },
        { label: "Feb", value: "93%", height: 71 },
        { label: "Mar", value: "94%", height: 74 },
        { label: "Apr", value: "96%", height: 78 },
        { label: "May", value: "97%", height: 80 }
      ]
    },
    aging: {
      summary: "7 Open",
      items: [
        { label: "0-7d", value: "2", height: 78 },
        { label: "8-15d", value: "2", height: 62 },
        { label: "16-30d", value: "1", height: 48 },
        { label: "31-45d", value: "1", height: 54 },
        { label: "45+d", value: "1", height: 58 }
      ]
    }
  },
  Quarterly: {
    disbursement: {
      summary: "97%",
      items: [
        { label: "Q1", value: "94%", height: 74 },
        { label: "Q2", value: "96%", height: 80 },
        { label: "Q3", value: "97%", height: 84 },
        { label: "Q4", value: "98%", height: 88 },
        { label: "FY", value: "98%", height: 90 }
      ]
    },
    aging: {
      summary: "4 Open",
      items: [
        { label: "0-7d", value: "1", height: 52 },
        { label: "8-15d", value: "1", height: 48 },
        { label: "16-30d", value: "1", height: 42 },
        { label: "31-45d", value: "1", height: 38 },
        { label: "45+d", value: "0", height: 18 }
      ]
    }
  }
};
