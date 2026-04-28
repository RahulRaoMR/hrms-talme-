"use client";

import Link from "next/link";
import SuiteShell from "@/components/suite-shell";

export default function RecruitmentPageClient() {
  return (
    <SuiteShell
      eyebrow="Recruitment Module"
      title="Hiring and Talent Acquisition"
      primaryHref="/dashboard"
      primaryLabel="Back to Dashboard"
    >
      <section className="page-section">
        <div className="panel-grid recruitment-grid">
          <Link href="/recruitment/job-openings" className="panel-card">
            <div className="panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3>Job Openings</h3>
            <p>Manage active positions and requirements</p>
          </Link>
          <Link href="/recruitment/candidates" className="panel-card">
            <div className="panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3>Candidates</h3>
            <p>Track applicants and their progress</p>
          </Link>
          <Link href="/recruitment/hiring-tracker" className="panel-card">
            <div className="panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 8 13 11 20 4" />
                <path d="M20 14v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
              </svg>
            </div>
            <h3>Hiring Tracker</h3>
            <p>Monitor recruitment pipeline metrics</p>
          </Link>
          <Link href="/recruitment/interviews" className="panel-card">
            <div className="panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 0 1 7 7c0 3.6-2.5 6.6-6 6.92V20" />
                <path d="M12 18a5 5 0 0 1-5-5 5 5 0 0 1 5-5" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </div>
            <h3>Interviews</h3>
            <p>Schedule and manage interview sessions</p>
          </Link>
          <Link href="/recruitment/offers" className="panel-card">
            <div className="panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <polyline points="4 4 12 12 20 4" />
                <path d="M4 20l8-8 8 8" />
              </svg>
            </div>
            <h3>Offers</h3>
            <p>Create and send job offers</p>
          </Link>
        </div>
      </section>
    </SuiteShell>
  );
}