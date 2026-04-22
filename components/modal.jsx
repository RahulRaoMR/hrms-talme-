"use client";

export default function Modal({ open, title, eyebrow, onClose, children }) {
  if (!open) return null;

  return (
    <div className="modal-shell" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
