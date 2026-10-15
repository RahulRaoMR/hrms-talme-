"use client";

import { useId } from "react";
import { X } from "lucide-react";

export default function Modal({ open, title, eyebrow, onClose, children }) {
  const titleId = useId();
  if (!open) return null;

  return (
    <div className="modal-shell" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3 id={titleId}>{title}</h3>
          </div>
          <button className="ghost-button core-modal-close" onClick={onClose} type="button" title="Close" aria-label="Close">
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
