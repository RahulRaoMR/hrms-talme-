export default function DashboardHero({ metrics }) {
  return (
    <section className="page-section hero-grid">
      <article className="hero-card">
        <p className="eyebrow">One Platform</p>
        <h2>ATS, HRMS, VMS, payroll, tax, and salary payments connected.</h2>
        <p className="body-copy">
          Your full sheet is now organized into a premium enterprise suite:
          recruitment, employee lifecycle, attendance, performance, payroll tax,
          vendor registration, search and filter, invoices, communication, and
          salary payment.
        </p>
        <div className="chip-row">
          <span>Recruitment</span>
          <span>Attendance</span>
          <span>Performance</span>
          <span>VMS</span>
          <span>Invoice Control</span>
          <span>Salary Payment</span>
        </div>
      </article>
      <article className="stats-grid">
        {metrics.map((metric) => (
          <div className="stat-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.meta}</small>
          </div>
        ))}
      </article>
    </section>
  );
}
