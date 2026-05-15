function pdfText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
}

function line(text, x, y, size = 9, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`;
}

function rect(x, y, width, height) {
  return `${x} ${y} ${width} ${height} re S`;
}

function filledRect(x, y, width, height, color = "0 0.22 0.57") {
  return `q ${color} rg ${x} ${y} ${width} ${height} re f Q`;
}

function cellText(value, x, y, width, size = 7) {
  const text = pdfText(value || "-");
  const maxChars = Math.max(8, Math.floor(width / (size * 0.48)));
  const lines = [];
  let remaining = text;

  while (remaining.length > maxChars && lines.length < 2) {
    const slice = remaining.slice(0, maxChars);
    const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf(","));
    const take = breakAt > 5 ? breakAt + 1 : maxChars;
    lines.push(remaining.slice(0, take).trim());
    remaining = remaining.slice(take).trim();
  }

  if (remaining) {
    lines.push(remaining.length > maxChars ? `${remaining.slice(0, maxChars - 1)}.` : remaining);
  }

  return lines.slice(0, 3).map((part, index) => line(part, x + 4, y - index * (size + 2), size)).join("\n");
}

function tablePageCommands({ employee, monthLabel, summary, rows, pageRows, pageNumber }) {
  const columns = [
    ["Employee ID", 62],
    ["Employee Name", 82],
    ["Department", 68],
    ["Designation", 78],
    ["Date", 58],
    ["Day", 58],
    ["Punch In", 54],
    ["Punch In Geo", 88],
    ["Punch Out", 58],
    ["Punch Out Geo", 88],
    ["Work", 58],
    ["Break", 48]
  ];
  const startX = 18;
  const tableTop = 420;
  const rowHeight = 34;
  const headerHeight = 36;
  let x = startX;

  const commands = [
    line("Talme HRMS Suite", 260, 560, 24, "F2"),
    line("Attendance Master", 315, 534, 16, "F2"),
    line(`${employee.employeeId || ""}  ${employee.name || ""}`, 28, 506, 12, "F2"),
    line(`${employee.department || "-"} - ${employee.designation || "-"}`, 28, 488, 9),
    line(`Month: ${monthLabel || "-"}`, 28, 466, 10, "F2"),
    line(`Present: ${summary?.presentDays || 0}`, 190, 466, 10),
    line(`Paid Leave: ${summary?.paidLeave || 0}`, 290, 466, 10),
    line(`OT Hours: ${summary?.otHours || 0}`, 410, 466, 10),
    line(`Page ${pageNumber}`, 770, 24, 8)
  ];

  columns.forEach(([label, width]) => {
    commands.push(filledRect(x, tableTop, width, headerHeight));
    commands.push(rect(x, tableTop, width, headerHeight));
    commands.push(cellText(label, x, tableTop + 22, width, 8));
    x += width;
  });

  pageRows.forEach((row, rowIndex) => {
    const y = tableTop - (rowIndex + 1) * rowHeight;
    x = startX;
    const values = [
      row.employeeId,
      row.name,
      row.department,
      row.designation,
      row.displayDate,
      row.day,
      row.punchIn,
      row.punchInGeo,
      row.punchOut,
      row.punchOutGeo,
      row.workingHours,
      row.breakHours
    ];

    columns.forEach(([, width], columnIndex) => {
      commands.push(rect(x, y, width, rowHeight));
      commands.push(cellText(values[columnIndex], x, y + 22, width, 7));
      x += width;
    });
  });

  if (!rows.length) {
    commands.push(line("No attendance rows found for this month.", 300, 290, 11));
  }

  return commands.join("\n");
}

export function createAttendanceMasterPdf({ employee = {}, monthLabel = "", summary = {}, rows = [] } = {}) {
  const rowsPerPage = 10;
  const chunks = [];

  for (let index = 0; index < Math.max(rows.length, 1); index += rowsPerPage) {
    chunks.push(rows.slice(index, index + rowsPerPage));
  }

  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageIds = [];
  const fontObjectId = chunks.length * 2 + 3;
  const boldFontObjectId = fontObjectId + 1;

  chunks.forEach((pageRows, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const commands = tablePageCommands({
      employee,
      monthLabel,
      summary,
      rows,
      pageRows,
      pageNumber: index + 1
    });

    pageIds.push(pageObjectId);
    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontObjectId} 0 R /F2 ${boldFontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] =
      `<< /Length ${Buffer.byteLength(commands, "utf8")} >>\nstream\n${commands}\nendstream`;
  });

  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[fontObjectId - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[boldFontObjectId - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n");
  pdf += `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
