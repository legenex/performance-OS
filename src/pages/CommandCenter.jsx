import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import AlertsStrip from "@/components/command/AlertsStrip";
import CashByAccount from "@/components/command/CashByAccount";
import ReceivablesAging from "@/components/command/ReceivablesAging";
import PayablesBySupplier from "@/components/command/PayablesBySupplier";
import WeekVsPlan from "@/components/command/WeekVsPlan";
import { formatMoney } from "@/lib/formatters";
import { TrendingUp, DollarSign, Clock } from "lucide-react";

export default function CommandCenter() {
  const { includeTest } = useOutletContext();
  const [snapshot, setSnapshot] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ReconSnapshot.list('-week_of', 5)
      .then(s => { setSnapshots(s); setSnapshot(s[0] || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Runway calc
  const last4 = snapshots.slice(0, 4);
  const avgBurn = last4.length > 1
    ? last4.reduce((sum, s, i) => {
        if (i === 0) return sum;
        return sum + ((last4[i-1]?.monday_number || 0) - (s?.monday_number || 0));
      }, 0) / (last4.length - 1)
    : 0;
  const runway = avgBurn > 0 ? Math.floor((snapshot?.cash || 0) / avgBurn) : null;

  // Media gap
  const mediaGap = snapshot?.media_gap || 0;

  return (
    <div>
      <PageHeader title="Command Center" subtitle="Financial mission control" />
      
      <AlertsStrip />

      {/* Top metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Monday Number"
          value={snapshot?.monday_number}
          basis="cash"
          icon={DollarSign}
        />
        <MetricCard
          label="Media Gap (MTD)"
          value={mediaGap}
          basis="cash"
          icon={TrendingUp}
        />
        <MetricCard
          label="Runway"
          value={null}
          icon={Clock}
        >
          <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {runway != null ? `${runway}w` : '—'}
          </div>
        </MetricCard>
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">Runway</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {runway != null ? `${runway} weeks` : '—'}
          </div>
          <div className="text-xs text-graphite-muted mt-1">Cash ÷ trailing 4-week net burn</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <CashByAccount />
        <ReceivablesAging />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PayablesBySupplier />
        <WeekVsPlan />
      </div>
    </div>
  );
}