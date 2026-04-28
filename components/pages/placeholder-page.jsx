import Link from "next/link";
import SuiteShell from "@/components/suite-shell";

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel
}) {
  return (
    <SuiteShell
      eyebrow={eyebrow}
      title={title}
      primaryHref={primaryHref}
      primaryLabel={primaryLabel}
    >
      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Overview</p>
              <h3>{title}</h3>
            </div>
          </div>
          <p className="body-copy">{description}</p>
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
        </article>

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
              <strong>{eyebrow}</strong>
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
      </section>
    </SuiteShell>
  );
}
