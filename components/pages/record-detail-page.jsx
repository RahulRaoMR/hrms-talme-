"use client";

import SuiteShell from "@/components/suite-shell";

export default function RecordDetailPage({
  eyebrow,
  title,
  brandEyebrow,
  primaryHref,
  primaryLabel,
  summary,
  details,
  sections = []
}) {
  return (
    <SuiteShell
      eyebrow={eyebrow}
      title={title}
      primaryHref={primaryHref}
      primaryLabel={primaryLabel}
      brandEyebrow={brandEyebrow}
    >
      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Summary</p>
              <h3>Record overview</h3>
            </div>
          </div>
          <p className="body-copy">{summary}</p>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Detail Fields</p>
              <h3>Operational metadata</h3>
            </div>
          </div>
          <div className="doc-stack">
            {details.map(([label, value]) => (
              <div className="doc-line" key={label}>
                <span>{label}</span>
                <strong>{String(value ?? "-")}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      {sections.map((section) => (
        <section className="page-section panel" key={section.title}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">{section.eyebrow || "Insights"}</p>
              <h3>{section.title}</h3>
            </div>
          </div>
          <div className="doc-stack">
            {section.items.map((item) => (
              <div className="doc-line" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </SuiteShell>
  );
}
