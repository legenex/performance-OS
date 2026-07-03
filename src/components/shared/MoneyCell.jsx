import React from "react";
import { formatMoney, isNegative } from "@/lib/formatters";

export default function MoneyCell({ value, basis, className = "" }) {
  const neg = isNegative(value);
  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
      <span className={neg ? "text-brand-coral" : "text-foreground"}>
        ${formatMoney(value)}
      </span>
      {basis && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
          basis === 'cash'
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            : 'border border-graphite-border text-graphite-muted'
        }`}>
          {basis}
        </span>
      )}
    </span>
  );
}