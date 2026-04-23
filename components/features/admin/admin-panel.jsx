export default function AdminPanel() {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">System Control</p>
          <h3>User Management & Activity Logs</h3>
        </div>
      </div>
      <div className="summary-grid">
        <div className="doc-stack">
          <div className="doc-line"><span>Active Users</span><strong>124</strong></div>
          <div className="doc-line"><span>Pending Approvals</span><strong>03</strong></div>
          <div className="doc-line"><span>Role Assignments</span><strong>Updated</strong></div>
        </div>
        <div className="doc-stack">
          <div className="doc-line"><span>Security Logs</span><strong>0 Alerts</strong></div>
          <div className="doc-line"><span>System Uptime</span><strong>99.9%</strong></div>
          <div className="doc-line"><span>Last Audit</span><strong>2h ago</strong></div>
        </div>
      </div>
    </article>
  );
}
