import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing-body">
      <section className="landing-shell">
        <article className="landing-card">
          <div className="landing-badge">Luxury Workforce Intelligence</div>
          <h1>Talme HRMS</h1>
          <p>
            Premium ATS, HRMS, VMS, payroll, payroll tax, attendance, vendor
            registration, invoices, communication, and salary payment in one
            corporate suite built with Next.js.
          </p>

          <div className="landing-grid">
            <label>
              <span>Corporate Email</span>
              <input defaultValue="director@talme.ai" />
            </label>
            <label>
              <span>Access Role</span>
              <input defaultValue="Enterprise Admin" />
            </label>
          </div>

          <div className="landing-actions">
            <Link className="ghost-button" href="/login">
              Workspace Login
            </Link>
            <Link className="primary-button" href="/login">
              Enter Suite
            </Link>
          </div>

          <div className="landing-modules">
            <span>ATS</span>
            <span>Employee Lifecycle</span>
            <span>Attendance &amp; T&amp;A</span>
            <span>Performance</span>
            <span>Payroll &amp; Tax</span>
            <span>VMS</span>
            <span>Invoice &amp; Payment</span>
            <span>Notifications</span>
          </div>
        </article>
      </section>
    </main>
  );
}
