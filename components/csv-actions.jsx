"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/modal";

function toCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows, columns) {
  const header = columns.map((column) => toCsvValue(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => toCsvValue(row[column.key])).join(","))
    .join("\n");
  const blob = new Blob([[header, body].filter(Boolean).join("\n")], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsv(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseCsvLine);
}

export default function CsvActions({
  filename,
  rows,
  columns,
  sample,
  onImport,
  onImported
}) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState(sample);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        className="mini-button"
        onClick={() => downloadCsv(filename, rows, columns)}
        type="button"
      >
        Export CSV
      </button>
      <button className="mini-button" onClick={() => setOpen(true)} type="button">
        Import CSV
      </button>
      <Modal
        open={open}
        eyebrow="CSV Import"
        title={`Import ${filename}`}
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await onImport(parseCsv(csvText));
              await onImported?.();
              setOpen(false);
            });
          }}
        >
          <label>
            <span>CSV rows</span>
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={8}
            />
          </label>
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Importing..." : "Import CSV"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
