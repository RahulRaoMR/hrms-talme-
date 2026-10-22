"use client";

export default function EmployeeSessionLoading({ error, onRetry }) {
  return <main className="employee-login-shell core-employee-login">
    <section className="employee-login-phone" aria-busy={!error}>
      <div className="employee-login-hero">
        <div className="employee-login-logo"><img src="/talme-logo.png" alt="Talme Logo" /></div>
        <p>Talme Technologies</p><h1>Employee App</h1>
      </div>
      <div className="employee-login-form" role="status">
        <p>{error || "Checking your session..."}</p>
        {error ? <button type="button" className="phone-primary" onClick={onRetry}>Retry</button> : null}
      </div>
    </section>
  </main>;
}
