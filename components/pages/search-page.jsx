"use client";

import { useEffect, useState } from "react";
import SuiteShell from "@/components/suite-shell";
import { apiUrl } from "@/lib/api-client";

const sections = [
  {
    key: "employees",
    label: "Employees",
    primary: (item) => item.name || item.employeeId || "Employee",
    badge: (item) => item.employeeId || item.status || "Employee",
    details: [
      ["Email", "email"],
      ["Department", "department"],
      ["Location", "location"],
      ["Manager", "manager"],
      ["Grade", "grade"],
      ["Salary", "salaryBand"],
      ["Bank", "bankStatus"]
    ]
  },
  {
    key: "candidates",
    label: "Candidates",
    primary: (item) => item.name || item.role || "Candidate",
    badge: (item) => item.status || item.stage || "Candidate",
    details: [
      ["Role", "role"],
      ["Stage", "stage"],
      ["Source", "source"],
      ["Client", "client"],
      ["Location", "location"],
      ["Notice", "noticePeriod"],
      ["Email", "email"],
      ["Phone", "phone"]
    ]
  },
  {
    key: "vendors",
    label: "Vendors",
    primary: (item) => item.vendor || item.name || "Vendor",
    badge: (item) => item.status || "Vendor",
    details: [
      ["Category", "category"],
      ["Sites", "sites"],
      ["Rating", "rating"]
    ]
  },
  {
    key: "invoices",
    label: "Invoices",
    primary: (item) => item.invoiceNo || item.vendor || "Invoice",
    badge: (item) => item.status || "Invoice",
    details: [
      ["Vendor", "vendor"],
      ["Amount", "amount"],
      ["TDS", "tds"],
      ["Attendance", "attendance"]
    ]
  },
  {
    key: "documents",
    label: "Documents",
    primary: (item) => item.docType || item.owner || "Document",
    badge: (item) => item.status || "Document",
    details: [
      ["Owner", "owner"],
      ["Module", "module"],
      ["Expiry", "expiry"]
    ]
  },
  {
    key: "approvals",
    label: "Approvals",
    primary: (item) => item.title || item.owner || "Approval",
    badge: (item) => item.status || "Approval",
    details: [
      ["Owner", "owner"],
      ["Module", "module"],
      ["Amount", "amount"],
      ["Level", "level"]
    ]
  }
];

const emptyResults = {
  employees: [],
  candidates: [],
  vendors: [],
  invoices: [],
  documents: [],
  approvals: []
};

function normalizeResults(payload) {
  return Object.fromEntries(
    Object.keys(emptyResults).map((key) => [key, Array.isArray(payload?.[key]) ? payload[key] : []])
  );
}

export default function SearchPageClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      const response = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(query)}`), {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!cancelled) setResults(normalizeResults(payload));
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <SuiteShell
      eyebrow="Global Search"
      title="Search Employees, ATS, VMS, Payroll, Documents, and Approvals"
      primaryHref="/dashboard"
      primaryLabel="Back To Dashboard"
      brandEyebrow="Search Suite"
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Unified Lookup</p>
            <h3>Search everywhere</h3>
          </div>
        </div>
        <div className="table-toolbar">
          <input
            className="search-input"
            placeholder="Search employee, invoice, vendor, candidate, document..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="page-section panel-grid">
        {sections.map((section) => (
          (() => {
            const matches = results[section.key] || [];

            return (
          <article className="panel" key={section.key}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">{section.label}</p>
                <h3>{matches.length} {query.trim() ? "matches" : "records"}</h3>
              </div>
            </div>
            <div className="search-result-stack">
              {matches.length ? (
                matches.map((item) => (
                  <div className="search-result-card" key={item.id || `${section.key}-${section.primary(item)}`}>
                    <div>
                      <strong>{section.primary(item)}</strong>
                      <small>{formatDetails(item, section.details)}</small>
                    </div>
                    <span>{section.badge(item)}</span>
                  </div>
                ))
              ) : (
                <div className="search-result-card">
                  <div>
                    <strong>No records available</strong>
                    <small>{query.trim() ? "Try another keyword." : "Add records in this module to see them here."}</small>
                  </div>
                </div>
              )}
            </div>
          </article>
            );
          })()
        ))}
      </section>
    </SuiteShell>
  );
}

function formatDetails(item, fields) {
  const details = fields
    .map(([label, field]) => {
      const value = displayValue(item[field]);
      return value ? `${label}: ${value}` : "";
    })
    .filter(Boolean);

  return details.length ? details.join(" | ") : "Details not added";
}

function displayValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  return String(value).trim();
}
