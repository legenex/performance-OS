import React from "react";
import { Zap, TrendingDown, AlertOctagon, Activity } from "lucide-react";

const ICONS = {
  CPL_SPIKE: Zap,
  SELLTHROUGH_DROP: TrendingDown,
  SPEND_ZERO_LEADS: AlertOctagon,
  FREQUENCY_CREEP: Activity,
};

export default function AnomalyStrip({ anomalies = [] }) {
  if (!anomalies.length) {
    return (
      <div className="text-xs text-graphite-muted px-3 py-2 bg-graphite-panel border border-graphite-border rounded-lg">
        No anomalies detected today.
      </div>
    );
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {anomalies.map((a, i) => {
        const Icon = ICONS[a.type] || Activity;
        const tone = a.severity === 'critical' ? 'border-brand-red/40 text-brand-red bg-brand-red/10'
          : a.severity === 'warning' ? 'border-brand-amber/40 text-brand-amber bg-brand-amber/10'
          : 'border-graphite-border text-graphite-muted bg-graphite-panel';
        return (
          <div key={i} className={`flex items-center gap-1.5 shrink-0 text-xs px-2.5 py-1.5 rounded-lg border ${tone}`}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{a.message}</span>
          </div>
        );
      })}
    </div>
  );
}