"use client";

import SuiteShell from "@/components/suite-shell";

const csvExports = [
  ["employees", "Employee Master CSV", "Profiles, salary bands, departments, and status"],
  ["candidates", "ATS Candidates CSV", "Pipeline, stage, source, and decision status"],
  ["vendors", "Vendor Master CSV", "Category, sites, rating, and vendor status"],
  ["invoices", "Invoice Queue CSV", "Attendance-linked finance and payment queue"],
  ["documents", "Document Register CSV", "Compliance, expiry, and module ownership"],
  ["approvals", "Approval Inbox CSV", "Multi-level approval queue and values"],
  ["notifications", "Notifications CSV", "Audience, channels, recipients, and send status"]
];

const pdfExports = [
  ["/api/pdf/payslip?employee=Manish%20Gupta&month=April%202026&band=INR%209.6L", "Payslip PDF"],
  ["/api/pdf/invoice?vendor=StaffCore%20India&invoiceNo=INV-4388&amount=INR%2042,40,000&status=Approved", "Invoice Summary PDF"],
  ["/api/pdf/offer?candidate=Neha%20Sharma&role=HRBP&location=Pune%20Plant&status=Draft", "Offer Letter PDF"]
];

export default function ExportsPageClient() {
  return (
    <SuiteShell
      eyebrow="Export Center"
      title="Advanced Export Center"
      primaryHref="/reports"
      primaryLabel="Open Reports"
      brandEyebrow="Export Suite"
    >
      <section className="page-section panel-grid">
        {csvExports.map(([dataset, title, summary]) => (
          <article className="panel" key={dataset}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">CSV Export</p>
                <h3>{title}</h3>
              </div>
            </div>
            <p className="body-copy">{summary}</p>
            <div className="landing-actions">
              <a className="primary-button" href={`/api/export/${dataset}`}>
                Download CSV
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="page-section panel-grid">
        {pdfExports.map(([href, title]) => (
          <article className="panel" key={href}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">PDF Export</p>
                <h3>{title}</h3>
              </div>
            </div>
            <div className="landing-actions">
              <a className="primary-button" href={href} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            </div>
          </article>
        ))}
      </section>
    </SuiteShell>
  );
}
