import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { formatNumber, formatPct } from "@/lib/formatters";
import { Filter } from "lucide-react";

const CRITERIA = [
  { key: "injured", label: "Injured" },
  { key: "attorney", label: "Has Attorney" },
  { key: "treatment", label: "In Treatment" },
  { key: "police_report", label: "Police Report" },
  { key: "insurance", label: "Has Insurance" },
];

export default function Qualification() {
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
    const truthy = (v) => v === true || (typeof v === "string" && ["yes", "true", "y", "1"].includes(v.toLowerCase()));
    return CRITERIA.map((c) => {
      const n = rows.filter((l) => truthy(l[c.key])).length;
      return { ...c, count: n, pct: (n / total) * 100 };
    });
  }, [rows]);

  const funnel = useMemo(() => {
    const total = rows.length;
    const sold = rows.filter((l) => l.lead_status === "Sold").length;
    const dq = rows.filter((l) => l.lead_status === "Disqualified").length;
    return { total, qualified: total - dq, sold, dq };
  }, [rows]);

  return (
    <div className="space-y-5">
      <PageHeader title="Qualification" subtitle="Qualification criteria coverage across the lead book" />

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Received", value: funnel.total },
              { label: "Qualified", value: funnel.qualified },
              { label: "Sold", value: funnel.sold },
              { label: "Disqualified", value: funnel.dq },
            ].map((m) => (
              <div key={m.label} className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
                <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">{m.label}</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-foreground">{formatNumber(m.value)}</div>
              </div>
            ))}
          </div>

          <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-graphite-muted" />
              <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider">Criteria Coverage</h3>
            </div>
            <div className="space-y-3">
              {stats.map((c) => (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{c.label}</span>
                    <span className="tabular-nums text-graphite-muted">{formatNumber(c.count)} · {formatPct(c.pct)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-graphite-well overflow-hidden">
                    <div className="h-full bg-brand-red/70" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}