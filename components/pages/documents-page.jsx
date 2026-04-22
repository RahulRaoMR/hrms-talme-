"use client";

import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

export default function DocumentsPageClient({ documents }) {
  return (
    <SuiteShell
      eyebrow="Document Management"
      title="KYC, Contracts, Invoices, and Compliance Vault"
      primaryHref="/settings"
      primaryLabel="Open Settings"
      brandEyebrow="Compliance Suite"
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Document Register</p>
            <h3>Expiry-aware compliance control</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Document</th>
              <th>Module</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.owner}</td>
                <td>{document.docType}</td>
                <td>{document.module}</td>
                <td>{document.expiry}</td>
                <td><StatusBadge tone={document.tone}>{document.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Upload Categories</p>
              <h3>Premium vault structure</h3>
            </div>
          </div>
          <div className="chip-row">
            <span>Employee KYC</span>
            <span>Vendor Contracts</span>
            <span>PF / ESI Challans</span>
            <span>Invoices</span>
            <span>Payslips</span>
            <span>Bank Advice</span>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Controls</p>
              <h3>Expiry automation</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>30-day expiry alert</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>Invoice release block</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>Audit trail</span><strong>Permanent</strong></div>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
