import React from "react";
import { formatMoney, formatMoneyShort, isNegative } from "@/lib/formatters";

export default function MetricCard({ label, value, basis, delta, deltaLabel, icon: Icon, onClick, compact }) {
  const neg = isNegative(value);
  const deltaNeg = isNegative(delta);
  
  return (
    <div 
      onClick={onClick}
      className={`bg-graphite-panel border border-graphite-border rounded-lg p-4 ${onClick ? 'cursor-pointer hover:border-graphite-muted/40 transition-colors' : ''} ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-graphite-muted uppercase tracking-wider">{label}</span>
        {basis && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
            basis === 'cash'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'border border-graphite-border text-graphite-muted'
          }`}>
            {basis}
          </span>
        )}
      </div>
      <div className={`font-mono tabular-nums font-bold ${compact ? 'text-lg' : 'text-2xl'} ${neg ? 'text-brand-coral' : 'text-foreground'}`}>
        ${formatMoney(value)}
      </div>
      {delta != null && (
        <div className={`mt-1 text-xs tabular-nums ${deltaNeg ? 'text-brand-coral' : 'text-emerald-400'}`}>
          {deltaNeg ? '▼' : '▲'} {deltaLabel || `${Math.abs(delta).toFixed(1)}% WoW`}
        </div>
      )}
    </div>
  );
}