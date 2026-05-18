import fs from "node:fs";
import path from "node:path";

const LOGO_FILE_PATH = path.join(process.cwd(), "public", "talme-logo-payslip.jpg");
const LOGO_WIDTH = 220;
const LOGO_HEIGHT = 241;

function pdfText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
}

function number(value) {
  return Number(value) || 0;
}

function amount(value) {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(number(value)))}`;
}

function decimal(value) {
  return number(value).toFixed(1);
}

function truncate(value, limit = 30) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function formatDate(value) {
  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${Number(isoMatch[2])}/${Number(isoMatch[3])}/${isoMatch[1]}`;
  }

  return text;
}

function monthLabel(value) {
  const text = String(value || "").trim();
  const inputMatch = text.match(/^(\d{4})-(\d{2})/);

  if (inputMatch) {
    return new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric"
    }).format(new Date(Number(inputMatch[1]), Number(inputMatch[2]) - 1, 1));
  }

  return text || "Current Month";
}

function payPeriod(value) {
  const label = monthLabel(value);
  const parsed = new Date(`1 ${label}`);

  if (Number.isNaN(parsed.getTime())) {
    return label;
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit"
  }).format(parsed).replace(" ", "-");
}

function text(value, x, y, size = 9.96, font = "F1") {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj ET`;
}

function textRight(value, rightX, y, size = 9.96, font = "F1") {
  const display = String(value ?? "");
  const width = display.length * size * 0.48;
  return text(display, Math.max(50, rightX - width), y, size, font);
}

function line(x1, y1, x2, y2, width = 0.48) {
  return `q ${width} w 0 G ${x1} ${y1} m ${x2} ${y2} l S Q`;
}

function rect(x, y, w, h, width = 0.48) {
  return `q ${width} w 0 G ${x} ${y} ${w} ${h} re S Q`;
}

function fillRect(x, y, w, h, gray = 0.94) {
  return `q ${gray} g ${x} ${y} ${w} ${h} re f Q`;
}

function image(name, x, y, w, h) {
  return `q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`;
}

export function buildPayslipRowsFromQuery(searchParams) {
  return [
    {
      employee: searchParams.get("employee") || "Employee",
      employeeId: searchParams.get("employeeId") || "",
      month: searchParams.get("month") || "Current Month",
      band: searchParams.get("band") || "",
      designation: searchParams.get("designation") || "",
      department: searchParams.get("department") || "",
      joiningDate: searchParams.get("joiningDate") || "",
      monthDays: searchParams.get("monthDays") || "",
      presentDays: searchParams.get("presentDays") || "",
      paidLeaves: searchParams.get("paidLeaves") || "",
      salaryDays: searchParams.get("salaryDays") || "",
      lopDays: searchParams.get("lopDays") || "",
      monthlyCtc: searchParams.get("monthlyCtc") || "",
      monthlyNetPay: searchParams.get("monthlyNetPay") || "",
      salaryExcludingOt: searchParams.get("salaryExcludingOt") || "",
      otHours: searchParams.get("otHours") || "",
      otAmount: searchParams.get("otAmount") || "",
      totalPay: searchParams.get("totalPay") || "",
      pan: searchParams.get("pan") || searchParams.get("employeePan") || "",
      uan: searchParams.get("uan") || searchParams.get("employeeUan") || "",
      bankName: searchParams.get("bankName") || "",
      bankAccountNumber: searchParams.get("bankAccountNumber") || searchParams.get("accountNo") || "",
      healthInsurance: searchParams.get("healthInsurance") || "",
      canteenExpenses: searchParams.get("canteenExpenses") || ""
    }
  ];
}

function normalizePayslip(row = {}) {
  const totalPay = number(row.totalPay || row.monthlyNetPay || row.salaryExcludingOt);
  const healthInsurance = row.healthInsurance === "" || row.healthInsurance === undefined
    ? (totalPay ? 500 : 0)
    : number(row.healthInsurance);
  const employeePf = number(row.employeePf);
  const professionalTax = number(row.professionalTax);
  const canteenExpenses = number(row.canteenExpenses);
  const totalDeductions = employeePf + professionalTax + healthInsurance;
  const grossEarnings = number(row.grossEarnings) || totalPay + totalDeductions + canteenExpenses;
  const basicSalary = number(row.basicSalary) || totalPay * 0.5;
  const hra = number(row.hra) || totalPay * 0.2;
  const conveyanceAllowance = number(row.conveyanceAllowance) || (totalPay ? 625 : 0);
  const specialAllowance = number(row.specialAllowance) ||
    Math.max(0, grossEarnings - basicSalary - hra - conveyanceAllowance);

  return {
    employee: row.employee || row.name || "Employee",
    employeeId: row.employeeId || "",
    designation: row.designation || row.grade || "",
    department: row.department || "",
    joiningDate: formatDate(row.joiningDate),
    month: monthLabel(row.month || row.monthLabel || row.monthKey),
    salaryPayPeriod: row.salaryPayPeriod || payPeriod(row.month || row.monthLabel || row.monthKey),
    paidDays: decimal(row.salaryDays || row.presentDays || 0),
    lopDays: decimal(row.lopDays || 0),
    pan: row.pan || row.employeePan || "",
    uan: row.uan || row.employeeUan || "",
    bankName: row.bankName || "",
    bankAccountNumber: row.bankAccountNumber || row.accountNo || "",
    basicSalary,
    hra,
    conveyanceAllowance,
    specialAllowance,
    grossEarnings,
    employeePf,
    professionalTax,
    healthInsurance,
    totalDeductions,
    employerPf: number(row.employerPf),
    edli: number(row.edli),
    pfAdminCharges: number(row.pfAdminCharges),
    canteenExpenses,
    totalPay
  };
}

function buildPayslipPage(row) {
  const slip = normalizePayslip(row);
  const commands = [
    rect(49.44, 276.05, 472.18, 512.83, 0.72),
    image("Im1", 466, 744.8, 39, 42.7),
    text("Talme Technologies Private Limited", 68.9, 759.48, 16, "F2"),
    text("No.24 Vittal Mallya Road, Level 14, Concorde Towers, UB City, Bangalore, 560001.", 91.46, 731.86, 10),
    text("Centre Name - UB City 2", 227.81, 719.02, 10),
    text(`Payslip for the Month of ${slip.month}`, 199.61, 704.86, 10, "F2"),
    fillRect(51.36, 685.9, 244.49, 14.52),
    fillRect(295.85, 685.9, 223.25, 14.52),
    text("Employee Pay Summary", 121.7, 690.46, 9, "F2"),
    text("Employee Net Pay", 364.51, 689.98, 10, "F2"),
    textRight(amount(slip.totalPay), 495.1, 663.34, 15, "F2"),

    text("Employee Name", 52.8, 675.1),
    text(truncate(slip.employee, 28), 174.5, 674.98),
    text("Employee ID", 52.8, 660.22),
    text(slip.employeeId, 174.62, 659.74, 12, "F2"),
    text("Designation", 52.8, 645.34),
    text(truncate(slip.designation, 26), 174.5, 645.22),
    text("Department", 52.8, 630.82),
    text(truncate(String(slip.department).toUpperCase(), 24), 174.5, 630.7, 11),
    text("Paid Days", 328.27, 630.82),
    textRight(slip.paidDays, 477.2, 630.82),
    text("Date of Joining", 52.8, 616.3),
    text(slip.joiningDate, 174.5, 616.06, 11),
    text("LOP Days", 328.15, 616.3),
    textRight(slip.lopDays, 477.2, 616.3),
    text("Salary Pay Period", 52.8, 601.78),
    text(slip.salaryPayPeriod, 174.5, 601.78),
    text("Employee PAN", 52.8, 587.26),
    text(slip.pan, 174.5, 587.14),
    text("Bank Name", 297.77, 587.26),
    text(truncate(slip.bankName, 22), 424.27, 587.14),
    text("Employee UAN", 52.8, 572.71),
    text(slip.uan, 174.5, 572.59),
    text("Bank Account Number", 297.77, 572.71),
    text(slip.bankAccountNumber, 436.03, 572.59),

    fillRect(51.36, 540.43, 468.22, 13.56),
    text("EARNINGS", 52.8, 543.55, 10, "F2"),
    text("AMOUNT", 212.45, 543.55, 10, "F2"),
    text("DEDUCTIONS", 297.77, 543.55, 10, "F2"),
    text("AMOUNT", 444.1, 543.55, 10, "F2"),
    text("Basic Salary", 52.8, 529.15),
    textRight(amount(slip.basicSalary), 255, 529.15),
    text("Employee's PF", 297.77, 529.15),
    textRight(amount(slip.employeePf), 482, 529.15),
    text("HRA", 52.8, 514.63),
    textRight(amount(slip.hra), 255, 514.63),
    text("Professional Tax", 297.77, 514.63),
    textRight(amount(slip.professionalTax), 482, 514.63),
    text("Conveyance Allowance", 52.8, 500.11),
    textRight(amount(slip.conveyanceAllowance), 255, 500.11),
    text("Health Insurance", 297.77, 500.11),
    textRight(amount(slip.healthInsurance), 482, 500.11),
    text("Special Allowance", 52.8, 485.59),
    textRight(amount(slip.specialAllowance), 255, 485.59),
    text("Gross Earnings", 52.8, 456.43, 10, "F2"),
    textRight(amount(slip.grossEarnings), 255, 456.43, 10, "F2"),
    text("Total Deductions", 297.77, 456.43, 10, "F2"),
    textRight(amount(slip.totalDeductions), 482, 456.43, 10, "F2"),

    text("Employer's PF", 52.8, 427.99),
    textRight(amount(slip.employerPf), 482, 427.51),
    text("EDLI", 52.8, 413.47),
    textRight(amount(slip.edli), 482, 412.99),
    text("PF Admin Charges", 52.8, 398.93),
    textRight(amount(slip.pfAdminCharges), 482, 398.45),
    text("Total", 387.07, 384.29, 10, "F2"),
    textRight(amount(slip.employerPf + slip.edli + slip.pfAdminCharges), 482, 383.81, 10, "F2"),

    fillRect(51.36, 351.65, 468.22, 13.56),
    text("NETPAY", 211.85, 355.25, 10, "F2"),
    text("AMOUNT", 444.1, 354.77, 10, "F2"),
    text("Gross Earnings", 67.94, 340.85),
    textRight(amount(slip.grossEarnings), 482, 340.37),
    text("(-) Total Deductions", 52.8, 326.33),
    textRight(amount(slip.totalDeductions), 482, 325.85),
    text("(-) Canteen Expenses", 52.8, 311.81),
    textRight(amount(slip.canteenExpenses), 482, 311.33),
    text("Total Net Payable", 328.03, 297.17, 10, "F2"),
    textRight(amount(slip.totalPay), 482, 296.69, 10, "F2"),
    text("**Total Net Payable = Gross Earnings - Total Deductions - Canteen Expenses**", 109.7, 282.77, 10, "F2")
  ];

  [786.96, 741.22, 715.18, 699.94, 685.42, 641.14, 626.62, 612.1, 597.58, 583.06, 568.51, 553.99, 539.47, 524.95, 510.43, 495.91, 481.39, 466.87, 452.35, 437.83, 423.31, 408.79, 394.25, 379.73, 365.21, 350.69, 336.17, 321.65, 307.13, 292.61, 278.09].forEach((y) => {
    commands.push(line(51.36, y, 519.58, y, 0.36));
  });

  [670.9, 655.66].forEach((y) => {
    commands.push(line(51.36, y, 295.85, y, 0.36));
  });

  [51.36, 174.02, 295.85, 412.75, 519.58].forEach((x) => {
    commands.push(line(x, 278.09, x, 686.38, 0.36));
  });

  return commands.join("\n");
}

export function createPayslipPdf(rows = []) {
  const pages = rows.length ? rows : [{ employee: "No salary rows", month: "Current Month" }];
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageIds = [];
  const fontRegularId = 3 + pages.length * 2;
  const fontBoldId = fontRegularId + 1;
  const imageId = fontBoldId + 1;

  pages.forEach((row, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const commands = buildPayslipPage(row);

    pageIds.push(pageObjectId);
    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] =
      `<< /Length ${Buffer.byteLength(commands, "utf8")} >>\nstream\n${commands}\nendstream`;
  });

  const logo = fs.readFileSync(LOGO_FILE_PATH);
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[fontRegularId - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[fontBoldId - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[imageId - 1] = Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${LOGO_WIDTH} /Height ${LOGO_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`, "utf8"),
    logo,
    Buffer.from("\nendstream", "utf8")
  ]);

  let pdf = Buffer.from("%PDF-1.4\n", "utf8");
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    const body = Buffer.isBuffer(object) ? object : Buffer.from(object, "utf8");
    pdf = Buffer.concat([
      pdf,
      Buffer.from(`${index + 1} 0 obj\n`, "utf8"),
      body,
      Buffer.from("\nendobj\n", "utf8")
    ]);
  });

  const xrefOffset = pdf.length;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    "%%EOF"
  ].join("\n");

  return Buffer.concat([pdf, Buffer.from(xref, "utf8")]);
}
