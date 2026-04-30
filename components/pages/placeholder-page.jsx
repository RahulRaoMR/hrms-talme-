import Link from "next/link";
import SuiteShell from "@/components/suite-shell";

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  brandEyebrow = "Coming Soon"
}) {
  const resolvedEyebrow = eyebrow || "Under Development";
  const resolvedDescription =
    description ||
    "We are setting up the core data structures and workflows for this module. Stay tuned for updates on feature availability.";

  return (
    <SuiteShell
      eyebrow={resolvedEyebrow}
      title={title}
      primaryHref={primaryHref}
      primaryLabel={primaryLabel}
      brandEyebrow={brandEyebrow}
    >
      <section className={`page-section ${primaryHref ? "split-grid" : "panel-grid"}`}>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{description ? "Overview" : "Work in progress"}</p>
              <h3>{description ? title : `${title} module is being initialized`}</h3>
            </div>
          </div>
          <p className="body-copy">{resolvedDescription}</p>
          {description ? (
            <div className="card-stack">
              <div className="process-card">
                <strong>Protected route</strong>
                <small>This screen is already connected to access control and module navigation.</small>
              </div>
              <div className="process-card">
                <strong>Ready for expansion</strong>
                <small>Add tables, forms, or workflow metrics here as the recruitment flow grows.</small>
              </div>
            </div>
          ) : (
            <div className="landing-modules" style={{ marginTop: "20px" }}>
              <span>Schema Setup</span>
              <span>API Layer</span>
              <span>UI Mockups</span>
            </div>
          )}
        </article>

        {primaryHref && primaryLabel ? (
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Status</p>
                <h3>Module checkpoint</h3>
              </div>
            </div>
            <div className="doc-stack">
              <div className="doc-line">
                <span>Page state</span>
                <strong>Available</strong>
              </div>
              <div className="doc-line">
                <span>Section</span>
                <strong>{resolvedEyebrow}</strong>
              </div>
              <div className="doc-line">
                <span>Next action</span>
                <strong>Continue from module hub</strong>
              </div>
            </div>
            <div className="card-stack">
              <Link className="ghost-button" href={primaryHref}>
                {primaryLabel}
              </Link>
            </div>
          </article>
        ) : null}
      </section>
    </SuiteShell>
  );
}
