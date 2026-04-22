"use client";

export default function Drawer({ open, eyebrow, title, onClose, children }) {
  return (
    <aside className={`insight-drawer ${open ? "open" : ""}`}>
      <div className="drawer-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <button className="ghost-button" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div className="drawer-stack">{children}</div>
    </aside>
  );
}
