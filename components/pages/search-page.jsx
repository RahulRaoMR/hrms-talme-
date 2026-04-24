"use client";

import { useEffect, useState } from "react";
import SuiteShell from "@/components/suite-shell";

const sections = [
  ["employees", "Employees", (item) => `${item.employeeId} - ${item.name}`],
  ["candidates", "Candidates", (item) => `${item.name} - ${item.role}`],
  ["vendors", "Vendors", (item) => `${item.vendor} - ${item.category}`],
  ["invoices", "Invoices", (item) => `${item.invoiceNo} - ${item.amount}`],
  ["documents", "Documents", (item) => `${item.owner} - ${item.docType}`],
  ["approvals", "Approvals", (item) => `${item.title} - ${item.owner}`]
];

export default function SearchPageClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({
    employees: [],
    candidates: [],
    vendors: [],
    invoices: [],
    documents: [],
    approvals: []
  });

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!cancelled) setResults(payload);
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
        {sections.map(([key, label, render]) => (
          <article className="panel" key={key}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">{label}</p>
                <h3>{results[key].length} matches</h3>
              </div>
            </div>
            <div className="doc-stack">
              {results[key].length ? (
                results[key].map((item) => (
                  <div className="doc-line" key={item.id}>
                    <span>{render(item)}</span>
                    <strong>Found</strong>
                  </div>
                ))
              ) : (
                <div className="doc-line">
                  <span>No results yet</span>
                  <strong>Search</strong>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </SuiteShell>
  );
}
