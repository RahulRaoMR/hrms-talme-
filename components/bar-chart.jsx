export default function BarChart({ eyebrow, title, summary, items }) {
  return (
    <article className="chart-card">
      <div className="chart-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <div className="chart-title">{title}</div>
        </div>
        <strong>{summary}</strong>
      </div>
      <div className="bar-chart">
        {items.map((item) => (
          <div className="bar-item" key={item.label}>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${item.height}%` }} />
            </div>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
