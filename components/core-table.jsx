"use client";

import { forwardRef } from "react";

const CoreTable = forwardRef(function CoreTable({ children, className = "", ...props }, ref) {
  return <div className="core-table-scroll" role="region" aria-label={props["aria-label"] || "Records"} tabIndex={0}><table {...props} className={className} ref={ref}>{children}</table></div>;
});

export default CoreTable;
