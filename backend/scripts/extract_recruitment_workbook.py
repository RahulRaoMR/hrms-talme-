import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def excel_date(value):
    text = normalize_text(value)
    if not text:
        return ""

    try:
        serial = float(text)
    except ValueError:
        return text

    if serial <= 0:
        return ""

    base = datetime(1899, 12, 30)
    dt = base + timedelta(days=serial)
    return dt.strftime("%Y-%m-%d")


def normalize_text(value):
    text = str(value or "").replace("\xa0", " ").strip()
    return " ".join(text.split())


def normalize_int(value):
    text = normalize_text(value)
    if not text:
      return None

    try:
        return int(float(text))
    except ValueError:
        return None


def normalize_float(value):
    text = normalize_text(value)
    if not text:
        return None

    try:
        return float(text)
    except ValueError:
        return None


def tone_from_status(status):
    lower = normalize_text(status).lower()

    positive_tokens = ("joined", "offer accepted", "offered", "selected")
    terminal_tokens = ("reject", "hold", "closed", "drop", "no show", "not interested")

    if any(token in lower for token in positive_tokens):
        return "teal"

    if any(token in lower for token in terminal_tokens):
        return "slate"

    return "gold"


def stage_from_status(status):
    lower = normalize_text(status).lower()

    if not lower:
        return "Pipeline"
    if "joined" in lower or "joining" in lower:
        return "Joining"
    if "offer" in lower or "document" in lower or "approval" in lower:
        return "Offer"
    if "tech 3" in lower:
        return "Tech 3"
    if "tech 2" in lower:
        return "Tech 2"
    if "tech 1" in lower:
        return "Tech 1"
    if "screen" in lower:
        return "Screening"
    if "source" in lower or "yet to screen" in lower:
        return "Sourcing"
    if "feedback" in lower:
        return "Client Feedback"
    return "Pipeline"


def row_to_dict(header, row):
    return {
        normalize_text(header[idx]): normalize_text(row[idx]) if idx < len(row) else ""
        for idx in range(len(header))
        if normalize_text(header[idx])
    }


def value_at_header(header, row, name, occurrence=1):
    seen = 0
    target = normalize_text(name)

    for idx, item in enumerate(header):
        if normalize_text(item) != target:
            continue

        seen += 1

        if seen == occurrence:
            return normalize_text(row[idx]) if idx < len(row) else ""

    return ""


def col_to_index(col):
    value = 0
    for ch in col:
        if ch.isalpha():
            value = value * 26 + (ord(ch.upper()) - 64)
    return value - 1


def load_workbook_rows(path):
    with zipfile.ZipFile(path) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS):
                text = "".join(node.text or "" for node in item.iterfind(".//m:t", NS))
                shared_strings.append(text)

        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = {}

        for sheet in workbook.find("m:sheets", NS):
            name = sheet.attrib["name"]
            target = "xl/" + rel_map[sheet.attrib[REL_NS]]
            root = ET.fromstring(archive.read(target))
            rows = []

            for row in root.find("m:sheetData", NS).findall("m:row", NS):
                values = {}
                for cell in row.findall("m:c", NS):
                    ref = cell.attrib.get("r", "")
                    col = "".join(ch for ch in ref if ch.isalpha())
                    idx = col_to_index(col)
                    cell_type = cell.attrib.get("t")
                    value_node = cell.find("m:v", NS)
                    value = ""

                    if cell_type == "s" and value_node is not None:
                        value = shared_strings[int(value_node.text)]
                    elif cell_type == "inlineStr":
                        inline = cell.find("m:is", NS)
                        if inline is not None:
                            value = "".join(node.text or "" for node in inline.iterfind(".//m:t", NS))
                    elif value_node is not None:
                        value = value_node.text or ""

                    values[idx] = value

                if values:
                    max_idx = max(values)
                    rows.append([values.get(i, "") for i in range(max_idx + 1)])

            sheets[name] = rows

        return sheets


def transform_job_openings(rows):
    header = rows[0]
    items = []
    seen = set()

    for row in rows[1:]:
        record = row_to_dict(header, row)
        job_id = record.get("Job ID")
        position = record.get("Position")

        if not job_id or not position or job_id in seen:
            continue

        seen.add(job_id)

        items.append(
            {
                "jobId": job_id,
                "agingDays": normalize_int(record.get("Aging")),
                "hireType": record.get("Type of Hire", ""),
                "postedDate": excel_date(record.get("Job Posted Date")),
                "businessUnit": record.get("Business Unit", ""),
                "department": record.get("Department", ""),
                "client": record.get("Client", ""),
                "domain": record.get("Domain", ""),
                "position": position,
                "priority": record.get("Priority", ""),
                "numberOfOpenings": normalize_int(record.get("Number of Openings")),
                "status": record.get("Position Current Status", ""),
                "remarks": record.get("Remarks", ""),
                "candidateConcerned": record.get("Candidate Concerned", ""),
                "holdDate": excel_date(record.get("Date of Hold")),
                "offerStageDate": excel_date(record.get("Date of Offer Stage")),
                "offerDate": excel_date(record.get("Date of Offer")),
                "joiningDate": excel_date(record.get("Date of Joining")),
                "candidateCtc": record.get("CTC of Candidate", ""),
                "source": record.get("Source", ""),
                "harmonizedRole": record.get("Harmonized Role", ""),
                "recruiterTagged": record.get("Recruiter tagged", ""),
                "originalJobPostDate": excel_date(record.get("Original Job Post Date")),
                "tone": tone_from_status(record.get("Position Current Status", "")),
            }
        )

    return items


def transform_candidates(rows):
    header = rows[0]
    items = []

    for row in rows[1:]:
        record = row_to_dict(header, row)
        candidate_name = value_at_header(header, row, "Candidate Name")
        position = value_at_header(header, row, "Position") or value_at_header(header, row, "Domain", 2)

        if not candidate_name or not position:
            continue

        current_status = value_at_header(header, row, "Candidate Current Status")
        items.append(
            {
                "jobId": value_at_header(header, row, "Job Id"),
                "recruiterId": value_at_header(header, row, "Recruiter Id"),
                "recruiterName": value_at_header(header, row, "Recruiter Name"),
                "name": candidate_name,
                "role": position,
                "stage": stage_from_status(current_status),
                "status": current_status or "Pipeline",
                "tone": tone_from_status(current_status),
                "source": value_at_header(header, row, "Source"),
                "businessUnit": value_at_header(header, row, "Business Unit"),
                "domain": value_at_header(header, row, "Domain", 1),
                "client": value_at_header(header, row, "Client"),
                "noticePeriod": value_at_header(header, row, "Notice Period"),
                "email": value_at_header(header, row, "Candidate Email"),
                "phone": value_at_header(header, row, "Phone No."),
                "qualification": value_at_header(header, row, "Qualification"),
                "yearsOfExperience": normalize_float(value_at_header(header, row, "Years of Exp")),
                "previousCompany": value_at_header(header, row, "Previous Company"),
                "previousCtc": value_at_header(header, row, "Previous CTC"),
                "location": value_at_header(header, row, "Location"),
                "preferredLocation": value_at_header(header, row, "Prefered Location"),
                "expectedCtc": value_at_header(header, row, "Expected CTC"),
                "sourceDate": excel_date(value_at_header(header, row, "Source Date")),
                "screeningDate": excel_date(value_at_header(header, row, "Screening Date")),
                "screeningNotes": value_at_header(header, row, "Screening Notes"),
                "tech1Date": excel_date(value_at_header(header, row, "Tech 1 date")),
                "tech1Status": value_at_header(header, row, "Tech 1 Status"),
                "tech1Remarks": value_at_header(header, row, "Tech 1 Remarks"),
                "tech1Panel": value_at_header(header, row, "Tech 1 Panel"),
                "tech2Date": excel_date(value_at_header(header, row, "Tech 2 date")),
                "tech2Status": value_at_header(header, row, "Tech 2 Status"),
                "tech2Remarks": value_at_header(header, row, "Tech 2 Remarks"),
                "tech2Panel": value_at_header(header, row, "Tech 2 Panel"),
                "tech3Date": excel_date(value_at_header(header, row, "Tech 3 date")),
                "tech3Status": value_at_header(header, row, "Tech 3 Status"),
                "tech3Remarks": value_at_header(header, row, "Tech 3 Remarks"),
                "tech3Panel": value_at_header(header, row, "Tech 3 Panel"),
                "offerStageInputDate": excel_date(value_at_header(header, row, "Offer Stage Input date")),
                "documentCollectionDate": excel_date(value_at_header(header, row, "Date of Document Collection")),
                "approvalDate": excel_date(value_at_header(header, row, "Date of Approval")),
                "offerDate": excel_date(value_at_header(header, row, "Offer Date")),
                "offerStatus": value_at_header(header, row, "Offer Status"),
                "offerDecisionDate": excel_date(value_at_header(header, row, "Date of Offer Accept/Reject")),
                "offerAcceptStatus": value_at_header(header, row, "Offer Accept Status"),
                "joiningDate": excel_date(value_at_header(header, row, "Date Of Joining")),
                "joiningStatus": value_at_header(header, row, "Joining Status"),
                "offeredCtc": value_at_header(header, row, "CTC Offered"),
            }
        )

    return items


def transform_recruiters(rows):
    header = rows[0]
    items = []
    seen = set()

    for row in rows[1:]:
        record = row_to_dict(header, row)
        recruiter_id = record.get("Recruiter ID")
        name = record.get("Recruiter Name")

        if not recruiter_id or not name or recruiter_id in seen:
            continue

        seen.add(recruiter_id)

        items.append(
            {
                "recruiterId": recruiter_id,
                "name": name,
                "email": record.get("Email", ""),
                "phoneNumber": record.get("Phone Number", ""),
                "currentStatus": record.get("Current Status", ""),
                "joinedDate": excel_date(record.get("Date of Joined")),
                "lwd": excel_date(record.get("LWD")),
                "designation": record.get("Designation", ""),
            }
        )

    return items


def transform_harmonized_roles(rows):
    header = rows[0]
    items = []
    seen = set()

    for row in rows[1:]:
        record = row_to_dict(header, row)
        position = record.get("Position")

        if not position or position in seen:
            continue

        seen.add(position)

        items.append(
            {
                "position": position,
                "harmonizedRole": record.get("Harmonized Role", ""),
            }
        )

    return items


def transform_performance(rows):
    header = [normalize_text(item) for item in rows[0]]
    items = []

    for row in rows[1:]:
        values = [normalize_text(item) for item in row]
        if not any(values):
            continue

        items.append(
            {
                "row": values,
                "header": header,
            }
        )

    return items


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main():
    workbook_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("sharepoint-import.xlsx")
    if not workbook_path.exists():
        raise SystemExit(f"Workbook {workbook_path} not found.")

    sheets = load_workbook_rows(workbook_path)
    output_dir = Path("data") / "recruitment"

    write_json(output_dir / "job-openings.json", transform_job_openings(sheets["Requirement Overview"]))
    write_json(output_dir / "candidates.json", transform_candidates(sheets["Candidate Master"]))
    write_json(output_dir / "recruiters.json", transform_recruiters(sheets["Recruiter"]))
    write_json(output_dir / "harmonized-roles.json", transform_harmonized_roles(sheets["H. Role"]))
    write_json(output_dir / "performance-review.json", transform_performance(sheets["Performance Review"]))

    summary = {
        "jobOpenings": len(transform_job_openings(sheets["Requirement Overview"])),
        "candidates": len(transform_candidates(sheets["Candidate Master"])),
        "recruiters": len(transform_recruiters(sheets["Recruiter"])),
        "harmonizedRoles": len(transform_harmonized_roles(sheets["H. Role"])),
        "performanceRows": len(transform_performance(sheets["Performance Review"])),
    }
    write_json(output_dir / "summary.json", summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
