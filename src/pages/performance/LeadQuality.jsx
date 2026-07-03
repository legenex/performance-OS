import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { formatNumber, formatPct } from "@/lib/formatters";
import { ShieldCheck } from "lucide-react";

const SIGNALS = [
  { key: "contact_phone_verified", label: "Phone Verified" },
  { key: "trustedform_present", label: "TrustedForm Present" },
];

export default function LeadQuality() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.entities.Lead.list("-created_at", 5000)
      .then((r) => { if (alive) setLeads(r); })
      .catch(() => { if (alive) setLeads([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => leads.filter((l) => includeTest || !l.is_test), [leads, includeTest]);

  const stats = useMemo(() => {
    const total = rows.length || 1;
    const dupes = rows.filter((l) => (l.dupe_count || 0) > 0).length;
    const dq = rows.filter((l) => l.lead_status === "Disqualified").length;
    const rejected = rows.filter((l) => l.lead_status === "Rejected").length;
    const fake = rows.filter((l) => l.lead_status === "Fake").length;
    const signalPct = SIGNALS.map((s) => ({ ...s, pct: (rows.filter((l) => l[s.key]).length / total) * 100 }));
    // DQ reason breakdown (by injury/treatment absence proxy)
    const reasons = {};
    rows.filter((l) => l.lead_status === "Disqualified").forEach((l) => {
      const r = l.buyer_return_reason || l.injury_type || "Unspecified";
      reasons[r] = (reasons[r] || 0) + 1;
    });
    const reasonList = Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 8);
    return { total: rows.length, dupes, dq, rejected, fake, signalPct, reasonList };
  }, [rows]);

  return (
    <div className="space-y-5">
      <PageHeader title="Lead Quality" subtitle="Verification signals, duplicates and disqualification reasons" />

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Leads", value: stats.total },
              { label: "Duplicates", value: stats.dupes },
              { label: "Disqualified", value: stats.dq },
              { label: "Rejected / Fake", value: stats.rejected + stats.fake },
            ].map((m) => (
              <div key={m.label} className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
                <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">{m.label}</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-foreground">{formatNumber(m.value)}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider">Verification Coverage</h3>
              </div>
              <div className="space-y-3">
                {stats.signalPct.map((s) => (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground">{s.label}</span>
                      <span className="tabular-nums text-graphite-muted">{formatPct(s.pct)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-graphite-well overflow-hidden">
                      <div className="h-full bg-emerald-500/70" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider mb-3">DQ Reason Breakdown</h3>
              {!stats.reasonList.length ? (
                <p className="text-xs text-graphite-muted">No disqualified leads.</p>
              ) : (
                <div className="space-y-2">
                  {stats.reasonList.map((r) => (
                    <div key={r.reason} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate">{r.reason}</span>
                      <span className="tabular-nums text-graphite-muted">{formatNumber(r.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}