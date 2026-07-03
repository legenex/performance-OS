import React from "react";

function Cpl({ label, value, tone }) {
  const toneClass = tone === 'true' ? 'text-foreground'
    : tone === 'billable' ? 'text-brand-amber'
    : 'text-brand-red';
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-graphite-muted">{label}</div>
      <div className={`font-mono tabular-nums text-sm font-bold ${toneClass}`}>
        {value == null ? '—' : `$${value.toFixed(2)}`}
      </div>
    </div>
  );
}

// The labeled CPL trio: TRUE / BILLABLE / SOLD.
export default function CplTrio({ trueCpl, billableCpl, soldCpl }) {
  return (
    <div className="flex gap-3">
      <Cpl label="True CPL" value={trueCpl} tone="true" />
      <Cpl label="Billable CPL" value={billableCpl} tone="billable" />
      <Cpl label="Sold CPL" value={soldCpl} tone="sold" />
    </div>
  );
}