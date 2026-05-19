"use client";

import { useEffect } from "react";

export default function AppSessionProvider({ children }) {
  useEffect(() => {
    window.localStorage.setItem("talme-theme-mode", "light");
    document.body.classList.add("light-mode");
  }, []);

  return children;
}
