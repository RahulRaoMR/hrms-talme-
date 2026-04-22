export default function StatusBadge({ tone = "slate", children }) {
  return <span className={`status ${tone}`}>{children}</span>;
}
