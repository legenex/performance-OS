import React from "react";
import { AlertTriangle } from "lucide-react";

// Compares platform cost-per-result to SOLD CPL. Amber when platform flatters
// (reports a lower cost) by more than 40%.
export default function DivergenceChip({ divergencePct }) {
  if (divergencePct == null) return <span className="text-[10px] text-graphite-muted">—</span>;
  const flatters = divergencePct > 40; // sold CPL is >40% above platform's reported CPR
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
      flatters
        ? 'bg-brand-amber/15 text-brand-amber border-brand-amber/40'
        : 'border-graphite-border text-graphite-muted'
    }`}>
      {flatters && <AlertTriangle className="w-3 h-3" />}
      {divergencePct > 0 ? '+' : ''}{divergencePct.toFixed(0)}% vs platform
    </span>
  );
}