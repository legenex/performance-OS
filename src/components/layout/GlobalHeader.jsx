import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { formatMoney, isNegative } from "@/lib/formatters";
import Sparkline from "@/components/shared/Sparkline";
import TestLeadToggle from "@/components/shared/TestLeadToggle";
import MondayNumberDrawer from "@/components/layout/MondayNumberDrawer";

export default function GlobalHeader({ includeTest, setIncludeTest }) {
  const [snapshots, setSnapshots] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    base44.entities.ReconSnapshot.list('-week_of', 13).then(setSnapshots).catch(() => {});
  }, []);

  const latest = snapshots[0];
  const prev = snapshots[1];
  const mondayNumber = latest?.monday_number ?? 0;
  const prevMN = prev?.monday_number ?? 0;
  const delta = prevMN !== 0 ? ((mondayNumber - prevMN) / Math.abs(prevMN)) * 100 : 0;
  const sparkData = [...snapshots].reverse().map(s => s.monday_number || 0);

  // State ring: normal=graphite, 1 decline=amber, 2+ declines=pulsing red
  const declineCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < snapshots.length - 1 && count < 2; i++) {
      if ((snapshots[i]?.monday_number ?? 0) < (snapshots[i + 1]?.monday_number ?? 0)) count++;
      else break;
    }
    return count;
  }, [snapshots]);

  const ringClass = declineCount >= 2
    ? 'ring-2 ring-brand-red animate-pulse-red'
    : declineCount === 1
      ? 'ring-2 ring-amber-500'
      : 'ring-1 ring-graphite-border';

  const neg = isNegative(mondayNumber);

  return (
    <>
      <header className="h-14 bg-graphite-base border-b border-graphite-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6">
          {/* Monday Number */}
          <button 
            onClick={() => setDrawerOpen(true)}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-lg bg-graphite-panel ${ringClass} transition-all hover:bg-graphite-lighter`}
          >
            <div>
              <div className="text-[10px] font-medium text-graphite-muted uppercase tracking-wider">Monday Number</div>
              <div className={`font-mono text-lg font-bold tabular-nums ${neg ? 'text-brand-coral' : 'text-foreground'}`}>
                ${formatMoney(mondayNumber)}
              </div>
            </div>
            <div className="w-24">
              <Sparkline data={sparkData} height={28} />
            </div>
            {delta !== 0 && (
              <span className={`text-xs font-medium tabular-nums px-1.5 py-0.5 rounded ${
                delta < 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            )}
          </button>

          {latest && (
            <div className="hidden lg:flex items-center gap-4 text-xs tabular-nums text-graphite-muted">
              <span>Cash <span className="text-foreground font-medium">${formatMoney(latest.cash)}</span></span>
              <span className="text-graphite-border">|</span>
              <span>AR <span className="text-foreground font-medium">${formatMoney(latest.ar_total)}</span></span>
              <span className="text-graphite-border">|</span>
              <span>AP <span className={`font-medium ${isNegative(-1 * (latest.ap_total || 0)) ? 'text-brand-coral' : 'text-foreground'}`}>(${formatMoney(latest.ap_total)})</span></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <TestLeadToggle includeTest={includeTest} onChange={setIncludeTest} />
        </div>
      </header>

      <MondayNumberDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} snapshot={latest} />
    </>
  );
}