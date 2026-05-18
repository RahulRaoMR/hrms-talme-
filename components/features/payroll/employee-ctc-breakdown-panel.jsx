"use client";

import { useEffect, useState } from "react";
import { calculateCtcBreakdown, formatInr, sanitizeAnnualCtc } from "@/lib/payroll-data";

const employeeTypes = ["Full Time", "Contract", "Intern", "Consultant"];
const taxRegimes = ["New Regime", "Old Regime"];

function estimateTax(annualCtc, taxRegime) {
  const taxable = Math.max(0, Number(annualCtc) || 0);

  if (taxRegime === "Old Regime") {
    if (taxable <= 500000) return 0;
    if (taxable <= 1000000) return Math.round((taxable - 500000) * 0.2);
    return Math.round(100000 + (taxable - 1000000) * 0.3);
  }

  if (taxable <= 700000) return 0;
  if (taxable <= 1200000) return Math.round((taxable - 700000) * 0.1);
  if (taxable <= 1500000) return Math.round(50000 + (taxable - 1200000) * 0.15);
  return Math.round(95000 + (taxable - 1500000) * 0.3);
}

export default function EmployeeCtcBreakdownPanel() {
  const [candidateName, setCandidateName] = useState("");
  const [annualCtcInput, setAnnualCtcInput] = useState("276000");
  const [employeeType, setEmployeeType] = useState(employeeTypes[0]);
  const [taxRegime, setTaxRegime] = useState(taxRegimes[0]);
  const [breakdown, setBreakdown] = useState(() => calculateCtcBreakdown(276000, ""));
  const [taxEstimate, setTaxEstimate] = useState(0);

  const annualCtc = sanitizeAnnualCtc(annualCtcInput);

  useEffect(() => {
    setBreakdown(calculateCtcBreakdown(annualCtc, candidateName));
    setTaxEstimate(estimateTax(annualCtc, taxRegime));
  }, [annualCtc, candidateName, taxRegime]);

  function generateOfferPdf() {
    const lines = breakdown.sections
      .flatMap((section) =>
        section.items.map(
          (item) =>
            `<tr><td>${section.label}</td><td>${item.label}</td><td>${formatInr(item.monthly)}</td><td>${formatInr(item.yearly)}</td></tr>`
        )
      )
      .join("");
    const popup = window.open("", "_blank", "width=920,height=720");

    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Offer CTC - ${breakdown.name || "Candidate"}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #172033; padding: 32px; }
            h1 { margin-bottom: 6px; }
            p { color: #536173; }
            table { border-collapse: collapse; width: 100%; margin-top: 24px; }
            th, td { border: 1px solid #d7dee9; padding: 10px; text-align: left; }
            th { background: #edf2f8; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
            .box { border: 1px solid #d7dee9; padding: 14px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Offer Compensation Breakup</h1>
          <p>${breakdown.name || "Candidate"} - ${employeeType} - ${taxRegime}</p>
          <div class="summary">
            <div class="box"><strong>${formatInr(breakdown.annualCtc)}</strong><br/>Annual CTC</div>
            <div class="box"><strong>${formatInr(breakdown.totalCompensationMonthly)}</strong><br/>Monthly CTC</div>
            <div class="box"><strong>${formatInr(taxEstimate)}</strong><br/>Estimated Annual Tax</div>
          </div>
          <table>
            <thead><tr><th>Section</th><th>Component</th><th>Monthly</th><th>Yearly</th></tr></thead>
            <tbody>${lines}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  return (
    <section className="page-section panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">CTC Calculator</p>
          <h3>Enter annual CTC and calculate the breakup</h3>
        </div>
        <button className="primary-button" onClick={generateOfferPdf} type="button">
          Generate Offer PDF
        </button>
      </div>

      <div className="form-grid">
        <label>
          <span>Name</span>
          <input
            placeholder="Candidate name"
            value={candidateName}
            onChange={(event) => setCandidateName(event.target.value)}
          />
        </label>
        <label>
          <span>Candidate&apos;s CTC</span>
          <input
            inputMode="numeric"
            placeholder="Enter annual CTC"
            value={annualCtcInput}
            onChange={(event) => setAnnualCtcInput(event.target.value)}
          />
        </label>
        <label>
          <span>Employee Type</span>
          <select value={employeeType} onChange={(event) => setEmployeeType(event.target.value)}>
            {employeeTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Tax Regime</span>
          <select value={taxRegime} onChange={(event) => setTaxRegime(event.target.value)}>
            {taxRegimes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="score-grid">
        <div className="score-card">
          <strong>{breakdown.name || "Candidate"}</strong>
          <small>Name</small>
        </div>
        <div className="score-card">
          <strong>{formatInr(breakdown.annualCtc)}</strong>
          <small>Annual CTC</small>
        </div>
        <div className="score-card">
          <strong>{formatInr(breakdown.totalCompensationMonthly)}</strong>
          <small>Monthly CTC</small>
        </div>
        <div className="score-card">
          <strong>{employeeType}</strong>
          <small>Employee type</small>
        </div>
        <div className="score-card">
          <strong>{taxRegime}</strong>
          <small>Tax regime</small>
        </div>
        <div className="score-card">
          <strong>{formatInr(taxEstimate)}</strong>
          <small>Estimated annual tax</small>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Section</th>
            <th>Salary Component</th>
            <th>Monthly</th>
            <th>Yearly</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.sections.flatMap((section) =>
            section.items.map((item, index) => (
              <tr
                className={item.emphasis ? "breakup-total-row" : undefined}
                key={`${section.label}-${item.label}`}
              >
                <td>{index === 0 ? section.label : ""}</td>
                <td>{item.label}</td>
                <td>{formatInr(item.monthly)}</td>
                <td>{formatInr(item.yearly)}</td>
                <td>{item.reason}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="body-copy breakup-note">
        Gross pay, statutory deductions, tax estimate, and net values recalculate automatically when CTC or regime changes.
      </p>
    </section>
  );
}
