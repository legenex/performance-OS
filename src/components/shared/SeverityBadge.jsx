import React from "react";

const styles = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30"
};

export default function SeverityBadge({ severity, children }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[severity] || styles.info}`}>
      {children}
    </span>
  );
}