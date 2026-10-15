"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CoreRowMenu({ children, className = "", onClose, ...props }) {
  const anchor = useRef(null);
  const menu = useRef(null);
  const [position, setPosition] = useState(null);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    const trigger = anchor.current.parentElement.querySelector('[aria-expanded="true"]');
    if (!trigger || !menu.current) return undefined;
    const bounds = trigger.getBoundingClientRect();
    const height = menu.current.offsetHeight;
    const width = menu.current.offsetWidth;
    setPosition({ left: Math.max(8, Math.min(bounds.right - width, innerWidth - width - 8)), top: bounds.bottom + height + 6 < innerHeight ? bounds.bottom + 6 : Math.max(8, bounds.top - height - 6) });
    menu.current.querySelector("button, a")?.focus({ preventScroll: true });
    const dismiss = () => close.current?.();
    const outside = (event) => { if (!menu.current?.contains(event.target) && !trigger.contains(event.target)) dismiss(); };
    const outsideScroll = (event) => { if (!menu.current?.contains(event.target)) dismiss(); };
    const keyboard = (event) => {
      if (event.key === "Escape") { event.preventDefault(); dismiss(); trigger.focus({ preventScroll: true }); }
      if (event.key === "Tab") dismiss();
      if (!menu.current?.contains(event.target)) return;
      const items = [...menu.current.querySelectorAll("button:not(:disabled), a[href]")];
      const index = items.indexOf(document.activeElement);
      const next = event.key === "ArrowDown" ? (index + 1) % items.length : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length : -1;
      if (next >= 0) { event.preventDefault(); items[next].focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    window.addEventListener("resize", dismiss);
    window.addEventListener("wheel", outsideScroll, { passive: true });
    window.addEventListener("touchmove", outsideScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("wheel", outsideScroll);
      window.removeEventListener("touchmove", outsideScroll);
    };
  }, []);

  return <><span ref={anchor} hidden />{typeof document !== "undefined" ? createPortal(<div {...props} ref={menu} className={`core-row-menu ${className}`} role="menu" style={{ ...position, visibility: position ? "visible" : "hidden" }}>{children}</div>, document.body) : null}</>;
}
