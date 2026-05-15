import StatusBadge from "@/components/status-badge";
import RunboardPanel from "./runboard-panel";

const fallbackSummary = {
  metrics: [],
  financialControl: [],
  readiness: [],
  stages: [],
  notifications: [],
  activityFeed: [],
  aiInsights: [],
  approvalFlow: [],
  sla: []
};

export default function PayrollOverview({ summary = fallbackSummary }) {
  const safeSummary = { ...fallbackSummary, ...summary };

  return (
    <>
      <section className="page-section stats-grid">
        {safeSummary.metrics.map((metric) => (
          <div className="score-card" key={metric.label}>
            <strong>{metric.value}</strong>
            <small>{metric.label}</small>
            <small>{metric.meta}</small>
          </div>
        ))}
      </section>

      <section className="page-section panel-grid">
        <RunboardPanel stages={safeSummary.stages} />
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Disbursement Snapshot</p>
              <h3>Financial control</h3>
            </div>
          </div>
          <div className="doc-stack">
            {safeSummary.financialControl.map((item) => (
              <div className="doc-line" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Release Readiness</p>
              <h3>Tax, bank, and compliance progress</h3>
            </div>
          </div>
          <div className="readiness-stack">
            {safeSummary.readiness.map((item) => (
              <div className="readiness-row" key={item.label}>
                <div className="readiness-head">
                  <span>{item.label}</span>
                  <strong>{item.percent}%</strong>
                </div>
                <div className="readiness-bar">
                  <span style={{ width: `${item.percent}%` }} />
                </div>
                <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Notification Center</p>
              <h3>Live finance alerts</h3>
            </div>
            <span className="notification-bell">{safeSummary.notifications.length}</span>
          </div>
          <div className="card-stack">
            {safeSummary.notifications.map((item) => (
              <div className="process-card finance-alert" key={item.label}>
                <strong>{item.label}</strong>
                <small>{item.meta}</small>
                <StatusBadge tone={item.tone}>Live</StatusBadge>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Activity Feed</p>
              <h3>Live timeline</h3>
            </div>
          </div>
          <div className="timeline-list">
            {safeSummary.activityFeed.map((item) => (
              <div className="timeline-item" key={`${item.time}-${item.title}`}>
                <span>{item.time}</span>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">AI Insights</p>
              <h3>Risk and opportunity signals</h3>
            </div>
          </div>
          <div className="card-stack">
            {safeSummary.aiInsights.map((item) => (
              <div className="process-card finance-alert" key={item.label}>
                <strong>{item.label}</strong>
                <small>{item.meta}</small>
                <StatusBadge tone={item.tone}>Insight</StatusBadge>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Approval Workflow</p>
              <h3>HR to release chain</h3>
            </div>
          </div>
          <div className="approval-flow">
            {safeSummary.approvalFlow.map((item) => (
              <div className="flow-card" key={item.role}>
                <strong>{item.role}</strong>
                <small>{item.name}</small>
                <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                <small>{item.timestamp}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">SLA Tracker</p>
              <h3>Corporate finance controls</h3>
            </div>
          </div>
          <div className="score-grid">
            {safeSummary.sla.map((item) => (
              <div className="score-card" key={item.label}>
                <strong>{item.value}</strong>
                <small>{item.label}</small>
                <small>{item.meta}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
