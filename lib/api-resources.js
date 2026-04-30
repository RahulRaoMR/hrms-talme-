import bcrypt from "bcryptjs";
import { publicUserSelect } from "@/lib/backend-core";
import { ApiRouteError } from "@/lib/api-route-factory";

function requiredString(payload, field, label = field) {
  const value = String(payload?.[field] ?? "").trim();

  if (!value) {
    throw new ApiRouteError(`${label} is required.`, 400);
  }

  return value;
}

function optionalString(payload, field) {
  const value = payload?.[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value).trim();
}

function requiredNumber(payload, field, label = field) {
  const value = Number(payload?.[field]);

  if (Number.isNaN(value)) {
    throw new ApiRouteError(`${label} must be a valid number.`, 400);
  }

  return value;
}

function optionalNumber(payload, field, label = field) {
  const rawValue = payload?.[field];

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return undefined;
  }

  const value = Number(rawValue);

  if (Number.isNaN(value)) {
    throw new ApiRouteError(`${label} must be a valid number.`, 400);
  }

  return value;
}

function optionalBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  throw new ApiRouteError("Active must be true or false.", 400);
}

function candidateExtraFields(payload) {
  return {
    jobId: optionalString(payload, "jobId"),
    recruiterId: optionalString(payload, "recruiterId"),
    recruiterName: optionalString(payload, "recruiterName"),
    businessUnit: optionalString(payload, "businessUnit"),
    domain: optionalString(payload, "domain"),
    client: optionalString(payload, "client"),
    noticePeriod: optionalString(payload, "noticePeriod"),
    email: optionalString(payload, "email"),
    phone: optionalString(payload, "phone"),
    qualification: optionalString(payload, "qualification"),
    yearsOfExperience: optionalNumber(payload, "yearsOfExperience", "Years of experience"),
    previousCompany: optionalString(payload, "previousCompany"),
    previousCtc: optionalString(payload, "previousCtc"),
    location: optionalString(payload, "location"),
    preferredLocation: optionalString(payload, "preferredLocation"),
    expectedCtc: optionalString(payload, "expectedCtc"),
    sourceDate: optionalString(payload, "sourceDate"),
    screeningDate: optionalString(payload, "screeningDate"),
    screeningNotes: optionalString(payload, "screeningNotes"),
    tech1Date: optionalString(payload, "tech1Date"),
    tech1Status: optionalString(payload, "tech1Status"),
    tech1Remarks: optionalString(payload, "tech1Remarks"),
    tech1Panel: optionalString(payload, "tech1Panel"),
    tech2Date: optionalString(payload, "tech2Date"),
    tech2Status: optionalString(payload, "tech2Status"),
    tech2Remarks: optionalString(payload, "tech2Remarks"),
    tech2Panel: optionalString(payload, "tech2Panel"),
    tech3Date: optionalString(payload, "tech3Date"),
    tech3Status: optionalString(payload, "tech3Status"),
    tech3Remarks: optionalString(payload, "tech3Remarks"),
    tech3Panel: optionalString(payload, "tech3Panel"),
    offerStageInputDate: optionalString(payload, "offerStageInputDate"),
    documentCollectionDate: optionalString(payload, "documentCollectionDate"),
    approvalDate: optionalString(payload, "approvalDate"),
    offerDate: optionalString(payload, "offerDate"),
    offerStatus: optionalString(payload, "offerStatus"),
    offerDecisionDate: optionalString(payload, "offerDecisionDate"),
    offerAcceptStatus: optionalString(payload, "offerAcceptStatus"),
    joiningDate: optionalString(payload, "joiningDate"),
    joiningStatus: optionalString(payload, "joiningStatus"),
    offeredCtc: optionalString(payload, "offeredCtc")
  };
}

const resourceConfigs = {
  candidates: {
    model: "candidate",
    entity: "Candidate",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        name: requiredString(payload, "name", "Name"),
        role: requiredString(payload, "role", "Role"),
        stage: requiredString(payload, "stage", "Stage"),
        source: requiredString(payload, "source", "Source"),
        status: optionalString(payload, "status") || "New",
        tone: optionalString(payload, "tone") || "gold",
        ...candidateExtraFields(payload)
      };
    },
    async updateData(payload) {
      return {
        name: optionalString(payload, "name"),
        role: optionalString(payload, "role"),
        stage: optionalString(payload, "stage"),
        source: optionalString(payload, "source"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone"),
        ...candidateExtraFields(payload)
      };
    },
    audit: {
      create: (record) => `Created candidate ${record.name}`,
      update: (record) => `Updated candidate ${record.name}`,
      delete: (record, id) => `Deleted candidate ${record?.name || id}`
    }
  },
  jobOpenings: {
    model: "jobOpening",
    entity: "JobOpening",
    orderBy: { postedDate: "desc" },
    async createData(payload) {
      return {
        jobId: requiredString(payload, "jobId", "Job ID"),
        agingDays: optionalNumber(payload, "agingDays", "Aging days"),
        hireType: optionalString(payload, "hireType"),
        postedDate: optionalString(payload, "postedDate"),
        businessUnit: optionalString(payload, "businessUnit"),
        department: optionalString(payload, "department"),
        client: optionalString(payload, "client"),
        domain: optionalString(payload, "domain"),
        position: requiredString(payload, "position", "Position"),
        priority: optionalString(payload, "priority"),
        numberOfOpenings: optionalNumber(payload, "numberOfOpenings", "Number of openings"),
        status: optionalString(payload, "status"),
        remarks: optionalString(payload, "remarks"),
        candidateConcerned: optionalString(payload, "candidateConcerned"),
        holdDate: optionalString(payload, "holdDate"),
        offerStageDate: optionalString(payload, "offerStageDate"),
        offerDate: optionalString(payload, "offerDate"),
        joiningDate: optionalString(payload, "joiningDate"),
        candidateCtc: optionalString(payload, "candidateCtc"),
        source: optionalString(payload, "source"),
        harmonizedRole: optionalString(payload, "harmonizedRole"),
        recruiterTagged: optionalString(payload, "recruiterTagged"),
        originalJobPostDate: optionalString(payload, "originalJobPostDate"),
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        jobId: optionalString(payload, "jobId"),
        agingDays: optionalNumber(payload, "agingDays", "Aging days"),
        hireType: optionalString(payload, "hireType"),
        postedDate: optionalString(payload, "postedDate"),
        businessUnit: optionalString(payload, "businessUnit"),
        department: optionalString(payload, "department"),
        client: optionalString(payload, "client"),
        domain: optionalString(payload, "domain"),
        position: optionalString(payload, "position"),
        priority: optionalString(payload, "priority"),
        numberOfOpenings: optionalNumber(payload, "numberOfOpenings", "Number of openings"),
        status: optionalString(payload, "status"),
        remarks: optionalString(payload, "remarks"),
        candidateConcerned: optionalString(payload, "candidateConcerned"),
        holdDate: optionalString(payload, "holdDate"),
        offerStageDate: optionalString(payload, "offerStageDate"),
        offerDate: optionalString(payload, "offerDate"),
        joiningDate: optionalString(payload, "joiningDate"),
        candidateCtc: optionalString(payload, "candidateCtc"),
        source: optionalString(payload, "source"),
        harmonizedRole: optionalString(payload, "harmonizedRole"),
        recruiterTagged: optionalString(payload, "recruiterTagged"),
        originalJobPostDate: optionalString(payload, "originalJobPostDate"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created job opening ${record.jobId}`,
      update: (record) => `Updated job opening ${record.jobId}`,
      delete: (record, id) => `Deleted job opening ${record?.jobId || id}`
    }
  },
  recruiters: {
    model: "recruiter",
    entity: "Recruiter",
    orderBy: { recruiterId: "asc" },
    async createData(payload) {
      return {
        recruiterId: requiredString(payload, "recruiterId", "Recruiter ID"),
        name: requiredString(payload, "name", "Name"),
        email: optionalString(payload, "email"),
        phoneNumber: optionalString(payload, "phoneNumber"),
        currentStatus: optionalString(payload, "currentStatus"),
        joinedDate: optionalString(payload, "joinedDate"),
        lwd: optionalString(payload, "lwd"),
        designation: optionalString(payload, "designation")
      };
    },
    async updateData(payload) {
      return {
        recruiterId: optionalString(payload, "recruiterId"),
        name: optionalString(payload, "name"),
        email: optionalString(payload, "email"),
        phoneNumber: optionalString(payload, "phoneNumber"),
        currentStatus: optionalString(payload, "currentStatus"),
        joinedDate: optionalString(payload, "joinedDate"),
        lwd: optionalString(payload, "lwd"),
        designation: optionalString(payload, "designation")
      };
    },
    audit: {
      create: (record) => `Created recruiter ${record.name}`,
      update: (record) => `Updated recruiter ${record.name}`,
      delete: (record, id) => `Deleted recruiter ${record?.name || id}`
    }
  },
  harmonizedRoles: {
    model: "harmonizedRole",
    entity: "HarmonizedRole",
    orderBy: { position: "asc" },
    async createData(payload) {
      return {
        position: requiredString(payload, "position", "Position"),
        harmonizedRole: optionalString(payload, "harmonizedRole")
      };
    },
    async updateData(payload) {
      return {
        position: optionalString(payload, "position"),
        harmonizedRole: optionalString(payload, "harmonizedRole")
      };
    },
    audit: {
      create: (record) => `Created harmonized role ${record.position}`,
      update: (record) => `Updated harmonized role ${record.position}`,
      delete: (record, id) => `Deleted harmonized role ${record?.position || id}`
    }
  },
  vendors: {
    model: "vendor",
    entity: "Vendor",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        vendor: requiredString(payload, "vendor", "Vendor name"),
        category: requiredString(payload, "category", "Category"),
        sites: requiredNumber(payload, "sites", "Sites"),
        rating: requiredNumber(payload, "rating", "Rating"),
        status: optionalString(payload, "status") || "New",
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        vendor: optionalString(payload, "vendor"),
        category: optionalString(payload, "category"),
        sites: optionalNumber(payload, "sites", "Sites"),
        rating: optionalNumber(payload, "rating", "Rating"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created vendor ${record.vendor}`,
      update: (record) => `Updated vendor ${record.vendor}`,
      delete: (record, id) => `Deleted vendor ${record?.vendor || id}`
    }
  },
  invoices: {
    model: "invoice",
    entity: "Invoice",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        vendor: requiredString(payload, "vendor", "Vendor"),
        invoiceNo: requiredString(payload, "invoiceNo", "Invoice number"),
        attendance: requiredString(payload, "attendance", "Attendance"),
        amount: requiredString(payload, "amount", "Amount"),
        status: optionalString(payload, "status") || "Queued",
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        vendor: optionalString(payload, "vendor"),
        invoiceNo: optionalString(payload, "invoiceNo"),
        attendance: optionalString(payload, "attendance"),
        amount: optionalString(payload, "amount"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created invoice ${record.invoiceNo}`,
      update: (record) => `Updated invoice ${record.invoiceNo}`,
      delete: (record, id) => `Deleted invoice ${record?.invoiceNo || id}`
    }
  },
  users: {
    model: "user",
    entity: "User",
    orderBy: { createdAt: "desc" },
    listSelect: publicUserSelect,
    itemSelect: publicUserSelect,
    async createData(payload) {
      return {
        name: requiredString(payload, "name", "Name"),
        email: requiredString(payload, "email", "Email"),
        role: requiredString(payload, "role", "Role"),
        active: optionalBoolean(payload?.active) ?? true,
        passwordHash: await bcrypt.hash(optionalString(payload, "password") || "talme123", 10)
      };
    },
    async updateData(payload) {
      const data = {
        name: optionalString(payload, "name"),
        email: optionalString(payload, "email"),
        role: optionalString(payload, "role"),
        active: optionalBoolean(payload?.active)
      };

      const password = optionalString(payload, "password");

      if (password) {
        data.passwordHash = await bcrypt.hash(password, 10);
      }

      return data;
    },
    audit: {
      create: (record) => `Created user ${record.email}`,
      update: (record) => `Updated user ${record.email}`,
      delete: (record, id) => `Deleted user ${record?.email || id}`
    }
  },
  employees: {
    model: "employee",
    entity: "Employee",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        employeeId: requiredString(payload, "employeeId", "Employee ID"),
        email: optionalString(payload, "email"),
        name: requiredString(payload, "name", "Name"),
        department: requiredString(payload, "department", "Department"),
        location: requiredString(payload, "location", "Location"),
        manager: requiredString(payload, "manager", "Manager"),
        grade: requiredString(payload, "grade", "Grade"),
        joiningDate: requiredString(payload, "joiningDate", "Joining date"),
        salaryBand: requiredString(payload, "salaryBand", "Salary band"),
        bankStatus: requiredString(payload, "bankStatus", "Bank status"),
        status: requiredString(payload, "status", "Status"),
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        employeeId: optionalString(payload, "employeeId"),
        email: optionalString(payload, "email"),
        name: optionalString(payload, "name"),
        department: optionalString(payload, "department"),
        location: optionalString(payload, "location"),
        manager: optionalString(payload, "manager"),
        grade: optionalString(payload, "grade"),
        joiningDate: optionalString(payload, "joiningDate"),
        salaryBand: optionalString(payload, "salaryBand"),
        bankStatus: optionalString(payload, "bankStatus"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created employee ${record.name}`,
      update: (record) => `Updated employee ${record.name}`,
      delete: (record, id) => `Deleted employee ${record?.name || id}`
    }
  },
  leaveRequests: {
    model: "leaveRequest",
    entity: "LeaveRequest",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        employee: requiredString(payload, "employee", "Employee"),
        leaveType: requiredString(payload, "leaveType", "Leave type"),
        dates: requiredString(payload, "dates", "Dates"),
        balance: requiredString(payload, "balance", "Balance"),
        approver: requiredString(payload, "approver", "Approver"),
        status: requiredString(payload, "status", "Status"),
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        employee: optionalString(payload, "employee"),
        leaveType: optionalString(payload, "leaveType"),
        dates: optionalString(payload, "dates"),
        balance: optionalString(payload, "balance"),
        approver: optionalString(payload, "approver"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created leave request for ${record.employee}`,
      update: (record) => `Updated leave request for ${record.employee}`,
      delete: (record, id) => `Deleted leave request for ${record?.employee || id}`
    }
  },
  attendanceRecords: {
    model: "attendanceRecord",
    entity: "AttendanceRecord",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        employee: requiredString(payload, "employee", "Employee"),
        present: requiredNumber(payload, "present", "Present days"),
        leaves: requiredNumber(payload, "leaves", "Leaves"),
        overtime: requiredNumber(payload, "overtime", "Overtime"),
        shift: requiredString(payload, "shift", "Shift"),
        lockState: requiredString(payload, "lockState", "Status"),
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        employee: optionalString(payload, "employee"),
        present: optionalNumber(payload, "present", "Present days"),
        leaves: optionalNumber(payload, "leaves", "Leaves"),
        overtime: optionalNumber(payload, "overtime", "Overtime"),
        shift: optionalString(payload, "shift"),
        lockState: optionalString(payload, "lockState"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created attendance row for ${record.employee}`,
      update: (record) => `Updated attendance row for ${record.employee}`,
      delete: (record, id) => `Deleted attendance row for ${record?.employee || id}`
    }
  },
  vendorWorkers: {
    model: "vendorWorker",
    entity: "VendorWorker",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        workerId: requiredString(payload, "workerId", "Worker ID"),
        name: requiredString(payload, "name", "Name"),
        vendor: requiredString(payload, "vendor", "Vendor"),
        site: requiredString(payload, "site", "Site"),
        skill: requiredString(payload, "skill", "Skill"),
        wageRate: requiredString(payload, "wageRate", "Wage rate"),
        attendance: requiredString(payload, "attendance", "Attendance"),
        status: requiredString(payload, "status", "Status"),
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        workerId: optionalString(payload, "workerId"),
        name: optionalString(payload, "name"),
        vendor: optionalString(payload, "vendor"),
        site: optionalString(payload, "site"),
        skill: optionalString(payload, "skill"),
        wageRate: optionalString(payload, "wageRate"),
        attendance: optionalString(payload, "attendance"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created vendor worker ${record.name}`,
      update: (record) => `Updated vendor worker ${record.name}`,
      delete: (record, id) => `Deleted vendor worker ${record?.name || id}`
    }
  },
  documents: {
    model: "documentRecord",
    entity: "DocumentRecord",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        owner: requiredString(payload, "owner", "Owner"),
        docType: requiredString(payload, "docType", "Document type"),
        module: requiredString(payload, "module", "Module"),
        expiry: requiredString(payload, "expiry", "Expiry"),
        status: requiredString(payload, "status", "Status"),
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        owner: optionalString(payload, "owner"),
        docType: optionalString(payload, "docType"),
        module: optionalString(payload, "module"),
        expiry: optionalString(payload, "expiry"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created document ${record.docType}`,
      update: (record) => `Updated document ${record.docType}`,
      delete: (record, id) => `Deleted document ${record?.docType || id}`
    }
  },
  approvals: {
    model: "approvalItem",
    entity: "ApprovalItem",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        module: requiredString(payload, "module", "Module"),
        title: requiredString(payload, "title", "Title"),
        owner: requiredString(payload, "owner", "Owner"),
        amount: requiredString(payload, "amount", "Amount"),
        level: requiredString(payload, "level", "Level"),
        status: requiredString(payload, "status", "Status"),
        tone: optionalString(payload, "tone") || "gold"
      };
    },
    async updateData(payload) {
      return {
        module: optionalString(payload, "module"),
        title: optionalString(payload, "title"),
        owner: optionalString(payload, "owner"),
        amount: optionalString(payload, "amount"),
        level: optionalString(payload, "level"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone")
      };
    },
    audit: {
      create: (record) => `Created approval ${record.title}`,
      update: (record) => `Updated approval ${record.title}`,
      delete: (record, id) => `Deleted approval ${record?.title || id}`
    }
  },
  settings: {
    model: "companySetting",
    entity: "CompanySetting",
    orderBy: { category: "asc" },
    async createData(payload) {
      return {
        category: requiredString(payload, "category", "Category"),
        name: requiredString(payload, "name", "Rule name"),
        value: requiredString(payload, "value", "Value"),
        status: requiredString(payload, "status", "Status")
      };
    },
    async updateData(payload) {
      return {
        category: optionalString(payload, "category"),
        name: optionalString(payload, "name"),
        value: optionalString(payload, "value"),
        status: optionalString(payload, "status")
      };
    },
    audit: {
      create: (record) => `Created setting ${record.name}`,
      update: (record) => `Updated setting ${record.name}`,
      delete: (record, id) => `Deleted setting ${record?.name || id}`
    }
  },
  notifications: {
    model: "notification",
    entity: "Notification",
    orderBy: { createdAt: "desc" },
    async createData(payload) {
      return {
        subject: requiredString(payload, "subject", "Subject"),
        audience: requiredString(payload, "audience", "Audience"),
        recipients: requiredString(payload, "recipients", "Recipients"),
        channel: requiredString(payload, "channel", "Channel"),
        message: requiredString(payload, "message", "Message"),
        status: optionalString(payload, "status") || "Draft",
        tone: optionalString(payload, "tone") || "gold",
        providerResult: null,
        providerError: null
      };
    },
    async updateData(payload) {
      return {
        subject: optionalString(payload, "subject"),
        audience: optionalString(payload, "audience"),
        recipients: optionalString(payload, "recipients"),
        channel: optionalString(payload, "channel"),
        message: optionalString(payload, "message"),
        status: optionalString(payload, "status"),
        tone: optionalString(payload, "tone"),
        providerResult: undefined,
        providerError: null
      };
    },
    audit: {
      create: (record) => `Created notification ${record.subject}`,
      update: (record) => `Updated notification ${record.subject}`,
      delete: (record, id) => `Deleted notification ${record?.subject || id}`
    }
  }
};

export function getResourceConfig(name) {
  const config = resourceConfigs[name];

  if (!config) {
    throw new ApiRouteError(`Unknown API resource: ${name}`, 500);
  }

  return config;
}
