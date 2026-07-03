import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { formatNumber } from "@/lib/formatters";
import { CheckCircle2, XCircle, AlertTriangle, Copy, FlaskConical } from "lucide-react";

export default function PipelineHealthPanel() {
  const [leads, setLeads] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.Lead.list("-created_at", 5000),
      base44.entities.SyncRun.list("-started_at", 50),
    ]).then(([l, r]) => { if (alive) { setLeads(l); setRuns(r); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const test = leads.filter((l) => l.is_test).length;
    const dupes = leads.filter((l) => (l.dupe_count || 0) > 0).length;
    const sold = leads.filter((l) => l.lead_status === "Sold").length;
    const dq = leads.filter((l) => l.lead_status === "Disqualified").length;
    const rejected = leads.filter((l) => l.lead_status === "Rejected").length;
    const queued = leads.filter((l) => l.lead_status === "Queued").length;

    // DQ reason breakdown
    const reasons = {};
    leads.filter((l) => l.lead_status === "Disqualified").forEach((l) => {
      const r = l.buyer_return_reason || l.injury_type || "Unspecified";
      reasons[r] = (reasons[r] || 0) + 1;
    });
    const reasonList = Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 6);

    // Validation gate: recent leads with required signals
    const recent = leads.slice(0, 500);
    const withPhone = recent.filter((l) => l.contact_phone_verified).length;
    const withTf = recent.filter((l) => l.trustedform_present).length;
    const gatePct = recent.length ? Math.round(((withPhone + withTf) / (recent.length * 2)) * 100) : 0;
    const gatePass = gatePct >= 70;

    return { total, test, dupes, sold, dq, rejected, queued, reasonList, gatePct, gatePass };
  }, [leads]);

  const funnel = [
    { label: "Received", value: stats.total, color: "bg-graphite-muted" },
    { label: "Queued", value: stats.queued, color: "bg-blue-500/70" },
    { label: "Sold", value: stats.sold, color: "bg-emerald-500/70" },
    { label: "Disqualified", value: stats.dq, color: "bg-amber-500/70" },
    { label: "Rejected", value: stats.rejected, color: "bg-brand-red/70" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  function staleClass(run) {
    if (!run.finished_at && !run.started_at) return "text-graphite-muted";
    const ts = new Date(run.finished_at || run.started_at).getTime();
    const hours = (Date.now() - ts) / 36e5;
    if (hours > 24) return "text-brand-coral";
    if (hours > 6) return "text-amber-400";
    return "text-emerald-400";
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: stats.total, icon: CheckCircle2, cls: "text-foreground" },
          { label: "Duplicates", value: stats.dupes, icon: Copy, cls: "text-amber-400" },
          { label: "Test Leads", value: stats.test, icon: FlaskConical, cls: "text-blue-400" },
          { label: "Disqualified", value: stats.dq, icon: XCircle, cls: "text-brand-coral" },
        ].map((m) => (
          <div key={m.label} className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-3.5 h-3.5 ${m.cls}`} />
              <span className="text-xs font-medium text-graphite-muted uppercase tracking-wider">{m.label}</span>
            </div>
            <div className="font-mono tabular-nums text-2xl font-bold text-foreground">{formatNumber(m.value)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel */}
        <div className="lg:col-span-2 bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider mb-3">Funnel</h3>
          <div className="space-y-2">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-xs text-graphite-muted w-24 shrink-0">{f.label}</span>
                <div className="flex-1 h-6 bg-graphite-well rounded overflow-hidden">
                  <div className={`h-full ${f.color} flex items-center justify-end px-2`} style={{ width: `${Math.max(3, (f.value / funnelMax) * 100)}%` }}>
                    <span className="text-[10px] font-medium text-white tabular-nums">{formatNumber(f.value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Gate tile */}
        <div className={`rounded-lg p-4 border ${stats.gatePass ? "bg-emerald-500/8 border-emerald-500/30" : "bg-brand-red/8 border-brand-red/30"}`}>
          <div className="flex items-center gap-2 mb-2">
            {stats.gatePass ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-brand-red" />}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-graphite-muted">Validation Gate</h3>
          </div>
          <div className={`font-mono tabular-nums text-3xl font-bold ${stats.gatePass ? "text-emerald-400" : "text-brand-red"}`}>{stats.gatePct}%</div>
          <p className="text-xs text-graphite-muted mt-1">Phone + TrustedForm coverage on the last 500 leads. {stats.gatePass ? "Gate passing." : "Below 70% threshold."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sync board */}
        <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-graphite-border"><h3 className="text-sm font-semibold text-foreground">Sync Board</h3></div>
          {!runs.length ? (
            <div className="px-4 py-6 text-xs text-graphite-muted text-center">No sync runs yet.</div>
          ) : (
            <div className="divide-y divide-graphite-border max-h-72 overflow-y-auto">
              {runs.map((r) => (
                <div key={r.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{r.source}</div>
                    <div className="text-[11px] text-graphite-muted">{r.rows_upserted ?? 0} upserted · {r.errors ?? 0} errors</div>
                  </div>
                  <span className={`text-[11px] tabular-nums ${staleClass(r)}`}>
                    {r.finished_at || r.started_at ? new Date(r.finished_at || r.started_at).toLocaleString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DQ breakdown */}
        <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-graphite-border"><h3 className="text-sm font-semibold text-foreground">DQ Reason Breakdown</h3></div>
          {!stats.reasonList.length ? (
            <div className="px-4 py-6 text-xs text-graphite-muted text-center">No disqualified leads.</div>
          ) : (
            <div className="divide-y divide-graphite-border">
              {stats.reasonList.map((r) => (
                <div key={r.reason} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-foreground truncate">{r.reason}</span>
                  <span className="text-xs tabular-nums text-graphite-muted">{formatNumber(r.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}