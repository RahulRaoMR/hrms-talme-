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
    href: "/shifts",
    label: "Manage Shifts",
    meta: "Scheduling and rotations",
    index: "03"
  },
  {
    href: "/leaves",
    label: "Leaves & Holidays",
    meta: "Absence management",
    index: "04"
  },
  {
    href: "/approvals",
    label: "Approval Requests",
    meta: "Pending actions",
    index: "05"
  },
  {
    href: "/payroll",
    label: "Payroll",
    meta: "Tax and salary",
    index: "06"
  },
  {
    href: "/loans",
    label: "Loan & Arrears",
    meta: "Financial assistance",
    index: "07"
  },
  {
    href: "/reports",
    label: "Reports",
    meta: "Standard insights",
    index: "08"
  },
  {
    href: "/dynamic-reports",
    label: "Dynamic Reports",
    meta: "Custom analytics",
    index: "09"
  },
  {
    href: "/users",
    label: "User Management",
    meta: "Access control",
    index: "10"
  },
  {
    href: "/activity",
    label: "Activity Logs",
    meta: "Audit history",
    index: "11"
  },
  {
    href: "/settings",
    label: "Setting",
    meta: "App configuration",
    index: "12"
  },
  {
    href: "/ats",
    label: "ATS",
    meta: "Recruitment",
    index: "13"
  },
  {
    href: "/vms",
    label: "VMS",
    meta: "Vendors",
    index: "14"
  }
];

export const storeKeys = {
  candidates: "talme-candidates",
  vendors: "talme-vendors",
  invoices: "talme-invoices"
};

export const demoSeed = {
  candidates: [
    {
      name: "Neha Sharma",
      role: "HRBP",
      stage: "Final Interview",
      source: "Direct ATS",
      label: "Pending",
      tone: "gold"
    },
    {
      name: "Arjun Menon",
      role: "Security Lead",
      stage: "Offer",
      source: "Staffing Vendor",
      label: "Approved",
      tone: "teal"
    },
    {
      name: "Sonal Rao",
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
