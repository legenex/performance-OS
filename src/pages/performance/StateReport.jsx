import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { formatMoney, formatNumber } from "@/lib/formatters";

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function StateReport() {
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

  const byState = useMemo(() => {
    const src = leads.filter((l) => includeTest || !l.is_test);
    const map = {};
    STATES.forEach((s) => { map[s] = { state: s, leads: 0, sold: 0, netProfit: 0 }; });
    src.forEach((l) => {
      const st = (l.accident_state || l.geo_state || "").toUpperCase().slice(0, 2);
      if (!map[st]) return;
      map[st].leads++;
      if (l.lead_status === "Sold") map[st].sold++;
      map[st].netProfit += l.net_profit || 0;
    });
    return map;
  }, [leads, includeTest]);

  const maxLeads = useMemo(() => Math.max(1, ...STATES.map((s) => byState[s].leads)), [byState]);

  function heat(count) {
    if (count === 0) return "bg-graphite-well text-graphite-faint border-graphite-border";
    const ratio = count / maxLeads;
    if (ratio > 0.66) return "bg-brand-red/70 text-white border-brand-red";
    if (ratio > 0.33) return "bg-brand-red/40 text-white border-brand-red/50";
    return "bg-brand-red/15 text-foreground border-brand-red/30";
  }

  return (
    <div className="space-y-5">
      <PageHeader title="State Report" subtitle="50-state heat grid — lead volume, sell-through and margin" />

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {STATES.map((s) => {
                const d = byState[s];
                return (
                  <div key={s} className={`rounded-lg border p-2 text-center ${heat(d.leads)}`} title={`${s}: ${d.leads} leads, ${d.sold} sold`}>
                    <div className="text-xs font-bold">{s}</div>
                    <div className="text-[10px] tabular-nums opacity-90">{formatNumber(d.leads)}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4 text-[11px] text-graphite-muted">
              <span>Low</span>
              <div className="w-6 h-3 rounded bg-brand-red/15 border border-brand-red/30" />
              <div className="w-6 h-3 rounded bg-brand-red/40 border border-brand-red/50" />
              <div className="w-6 h-3 rounded bg-brand-red/70 border border-brand-red" />
              <span>High</span>
            </div>
          </div>

          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-graphite-border"><h2 className="text-sm font-semibold text-foreground">Top States</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">State</th>
                    <th className="text-right px-4 py-2 font-medium">Leads</th>
                    <th className="text-right px-4 py-2 font-medium">Sold</th>
                    <th className="text-right px-4 py-2 font-medium">Sell-through</th>
                    <th className="text-right px-4 py-2 font-medium">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-border">
                  {STATES.map((s) => byState[s]).filter((d) => d.leads > 0).sort((a, b) => b.leads - a.leads).map((d) => (
                    <tr key={d.state}>
                      <td className="px-4 py-2 text-foreground font-medium">{d.state}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(d.leads)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(d.sold)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-foreground">{d.leads ? ((d.sold / d.leads) * 100).toFixed(1) : "0"}%</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${d.netProfit < 0 ? "text-brand-coral" : "text-foreground"}`}>${formatMoney(d.netProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}