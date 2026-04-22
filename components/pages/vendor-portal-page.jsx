"use client";

import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

export default function VendorPortalPageClient({ data }) {
  return (
    <SuiteShell
      eyebrow="Vendor Portal"
      title="Registration, Worker Uploads, Invoices, and Payment Tracking"
      primaryHref="/notifications"
      primaryLabel="Open Alerts"
      brandEyebrow="Supplier Suite"
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Vendor Profile</p>
              <h3>Supplier onboarding status</h3>
            </div>
          </div>
          <div className="doc-stack">
            {data.vendors.map((vendor) => (
              <div className="doc-line" key={vendor.id}>
                <span>{vendor.vendor} - {vendor.category}</span>
                <strong>{vendor.status}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Worker Management</p>
              <h3>Contract workforce</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Worker</th>
                <th>Site</th>
                <th>Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.workers.map((worker) => (
                <tr key={worker.id}>
                  <td>{worker.workerId}</td>
                  <td>{worker.name}</td>
                  <td>{worker.site}</td>
                  <td>{worker.wageRate}</td>
                  <td><StatusBadge tone={worker.tone}>{worker.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Invoice and Payment</p>
            <h3>Track payment status</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Invoice</th>
              <th>Attendance</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.vendor}</td>
                <td>{invoice.invoiceNo}</td>
                <td>{invoice.attendance}</td>
                <td>{invoice.amount}</td>
                <td><StatusBadge tone={invoice.tone}>{invoice.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </SuiteShell>
  );
}
