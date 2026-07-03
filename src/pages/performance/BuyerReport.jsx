import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ExportButton from "@/components/shared/ExportButton";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { Users } from "lucide-react";

export default function BuyerReport() {
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
      const k = l.buyer_name || "Unassigned";
      map[k] = map[k] || { buyer: k, leads: 0, sold: 0, returned: 0, revenue: 0, netProfit: 0, converted: 0 };
      map[k].leads++;
      if (l.lead_status === "Sold") map[k].sold++;
      if (l.buyer_returned || l.lead_status === "Returned") map[k].returned++;
      if (l.buyer_conversion) map[k].converted++;
      map[k].revenue += l.lead_revenue || 0;
      map[k].netProfit += l.net_profit || 0;
    });
    return Object.values(map).map((b) => ({
      ...b,
      returnRate: b.sold ? (b.returned / b.sold) * 100 : 0,
      convRate: b.sold ? (b.converted / b.sold) * 100 : 0,
      revPerSold: b.sold ? b.revenue / b.sold : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [leads, includeTest]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buyer Report"
        subtitle="Volume, return rate, conversion and revenue by buyer"
        actions={rows.length ? <ExportButton filename="buyer-report" rows={rows} columns={[
          { key: "buyer", label: "Buyer" }, { key: "leads", label: "Leads" }, { key: "sold", label: "Sold" },
          { key: "returned", label: "Returned" }, { key: "returnRate", label: "Return %" },
          { key: "convRate", label: "Conv %" }, { key: "revenue", label: "Revenue" }, { key: "netProfit", label: "Net Profit" },
        ]} /> : null}
      />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !rows.length ? (
          <EmptyState icon={Users} title="No buyer data" description="Buyer performance appears once leads are sold." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Buyer</th>
                  <th className="text-right px-4 py-2 font-medium">Leads</th>
                  <th className="text-right px-4 py-2 font-medium">Sold</th>
                  <th className="text-right px-4 py-2 font-medium">Return %</th>
                  <th className="text-right px-4 py-2 font-medium">Conv %</th>
                  <th className="text-right px-4 py-2 font-medium">Rev / Sold</th>
                  <th className="text-right px-4 py-2 font-medium">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {rows.map((b) => (
                  <tr key={b.buyer} className="hover:bg-graphite-elevated/40">
                    <td className="px-4 py-2 text-foreground font-medium">{b.buyer}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(b.leads)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(b.sold)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${b.returnRate > 15 ? "text-brand-coral" : "text-foreground"}`}>{b.returnRate.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{b.convRate.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(b.revPerSold)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(b.revenue)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${b.netProfit < 0 ? "text-brand-coral" : "text-foreground"}`}>${formatMoney(b.netProfit)}</td>
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