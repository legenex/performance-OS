import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ExportButton from "@/components/shared/ExportButton";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { Boxes } from "lucide-react";

// Verdict: STAR / OK / REVIEW TERMS / PAUSE
function verdict(s) {
  const margin = s.netProfit;
  const sellThrough = s.leads ? s.sold / s.leads : 0;
  const returnRate = s.sold ? s.returned / s.sold : 0;
  if (margin > 0 && sellThrough >= 0.5 && returnRate < 0.1) return { label: "STAR", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" };
  if (margin < 0 || sellThrough < 0.25) return { label: "PAUSE", cls: "bg-brand-red/15 text-brand-red border-brand-red/40" };
  if (returnRate >= 0.2 || sellThrough < 0.4) return { label: "REVIEW TERMS", cls: "bg-amber-500/15 text-amber-400 border-amber-500/40" };
  return { label: "OK", cls: "bg-blue-500/15 text-blue-400 border-blue-500/40" };
}

export default function SupplierPerformance() {
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

  const rows = useMemo(() => {
    const src = leads.filter((l) => includeTest || !l.is_test);
    const map = {};
    src.forEach((l) => {
      const k = l.supplier_sid || l.supplier_source || "Unknown";
      map[k] = map[k] || { sid: k, leads: 0, sold: 0, returned: 0, dq: 0, revenue: 0, payout: 0, netProfit: 0 };
      map[k].leads++;
      if (l.lead_status === "Sold") map[k].sold++;
      if (l.buyer_returned || l.lead_status === "Returned") map[k].returned++;
      if (l.lead_status === "Disqualified") map[k].dq++;
      map[k].revenue += l.lead_revenue || 0;
      map[k].payout += l.supplier_payout || 0;
      map[k].netProfit += l.net_profit || 0;
    });
    return Object.values(map).map((s) => ({ ...s, v: verdict(s), sellThrough: s.leads ? (s.sold / s.leads) * 100 : 0 }))
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [leads, includeTest]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Supplier Performance"
        subtitle="Margin, sell-through and a STAR / OK / REVIEW TERMS / PAUSE verdict per supplier"
        actions={rows.length ? <ExportButton filename="supplier-performance" rows={rows.map((r) => ({ ...r, verdict: r.v.label }))} columns={[
          { key: "sid", label: "Supplier" }, { key: "leads", label: "Leads" }, { key: "sold", label: "Sold" },
          { key: "sellThrough", label: "Sell-through %" }, { key: "returned", label: "Returned" },
          { key: "revenue", label: "Revenue" }, { key: "payout", label: "Payout" }, { key: "netProfit", label: "Net Profit" }, { key: "verdict", label: "Verdict" },
        ]} /> : null}
      />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !rows.length ? (
          <EmptyState icon={Boxes} title="No supplier data" description="Supplier performance appears once leads are imported." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Supplier</th>
                  <th className="text-right px-4 py-2 font-medium">Leads</th>
                  <th className="text-right px-4 py-2 font-medium">Sold</th>
                  <th className="text-right px-4 py-2 font-medium">Sell-through</th>
                  <th className="text-right px-4 py-2 font-medium">Returned</th>
                  <th className="text-right px-4 py-2 font-medium">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium">Payout</th>
                  <th className="text-right px-4 py-2 font-medium">Net Profit</th>
                  <th className="text-center px-4 py-2 font-medium">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {rows.map((s) => (
                  <tr key={s.sid} className="hover:bg-graphite-elevated/40">
                    <td className="px-4 py-2 text-foreground font-medium">{s.sid}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(s.leads)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(s.sold)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{s.sellThrough.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(s.returned)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(s.revenue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(s.payout)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${s.netProfit < 0 ? "text-brand-coral" : "text-foreground"}`}>${formatMoney(s.netProfit)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.v.cls}`}>{s.v.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}