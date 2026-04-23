"use client";

import SuiteShell from "@/components/suite-shell";

export default function PlaceholderPage({ title, eyebrow }) {
  return (
    <SuiteShell
      eyebrow={eyebrow || "Under Development"}
      title={title}
      brandEyebrow="Coming Soon"
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Work in progress</p>
              <h3>{title} module is being initialized</h3>
            </div>
          </div>
          <p className="body-copy">
            We are setting up the core data structures and workflows for this module. 
            Stay tuned for updates on feature availability.
          </p>
          <div className="landing-modules" style={{ marginTop: "20px" }}>
            <span>Schema Setup</span>
            <span>API Layer</span>
            <span>UI Mockups</span>
          </div>
        </article>
      </section>
    </SuiteShell>
  );
}
