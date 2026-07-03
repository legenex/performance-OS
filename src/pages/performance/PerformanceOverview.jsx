import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import EmptyState from "@/components/shared/EmptyState";
import ExportButton from "@/components/shared/ExportButton";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { BarChart3 } from "lucide-react";

function dayStr(d) { return d.toISOString().slice(0, 10); }

export default function PerformanceOverview() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.entities.Lead.list("-created_at", 5000)
      .then((rows) => { if (alive) setLeads(rows); })
      .catch(() => { if (alive) setLeads([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => leads.filter((l) => includeTest || !l.is_test), [leads, includeTest]);

  const totals = useMemo(() => {
    const t = { leads: rows.length, sold: 0, revenue: 0, netProfit: 0, returned: 0 };
    rows.forEach((l) => {
      if (l.lead_status === "Sold") t.sold++;
      if (l.buyer_returned || l.lead_status === "Returned") t.returned++;
      t.revenue += l.lead_revenue || 0;
      t.netProfit += l.net_profit || 0;
    });
    return t;
  }, [rows]);

  // Daily table (last 14 days)
  const daily = useMemo(() => {
    const map = {};
    rows.forEach((l) => {
      const d = (l.created_at || "").slice(0, 10);
      if (!d) return;
      map[d] = map[d] || { date: d, leads: 0, sold: 0, revenue: 0, netProfit: 0 };
      map[d].leads++;
      if (l.lead_status === "Sold") map[d].sold++;
      map[d].revenue += l.lead_revenue || 0;
      map[d].netProfit += l.net_profit || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  }, [rows]);

  // Retargeting trend: leads by day, last 7
  const trend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(dayStr(d)); }
    const map = {};
    rows.forEach((l) => { const d = (l.created_at || "").slice(0, 10); if (d) map[d] = (map[d] || 0) + 1; });
    const max = Math.max(1, ...days.map((d) => map[d] || 0));
    return days.map((d) => ({ date: d, count: map[d] || 0, pct: ((map[d] || 0) / max) * 100 }));
  }, [rows]);

  const sellThrough = totals.leads ? (totals.sold / totals.leads) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Performance Overview"
        subtitle="Volume, sell-through and true margin across the book"
        actions={daily.length ? <ExportButton filename="performance-overview" rows={daily} columns={[
          { key: "date", label: "Date" }, { key: "leads", label: "Leads" }, { key: "sold", label: "Sold" },
          { key: "revenue", label: "Revenue" }, { key: "netProfit", label: "Net Profit" },
        ]} /> : null}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">Total Leads</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-foreground">{formatNumber(totals.leads)}</div>
          <div className="text-xs text-graphite-muted mt-1">{formatNumber(totals.sold)} sold · {sellThrough.toFixed(1)}% sell-through</div>
        </div>
        <MetricCard label="Revenue" value={totals.revenue} basis="booked" />
        <MetricCard label="Net Profit" value={totals.netProfit} basis="booked" />
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">Returned</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-foreground">{formatNumber(totals.returned)}</div>
          <div className="text-xs text-graphite-muted mt-1">{totals.leads ? ((totals.returned / totals.leads) * 100).toFixed(1) : "0"}% return rate</div>
        </div>
      </div>

      {/* Trend / retargeting */}
      <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
        <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider mb-3">7-Day Lead Trend</h3>
        <div className="flex items-end gap-2 h-28">
          {trend.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-brand-red/70 rounded-t" style={{ height: `${Math.max(4, d.pct)}%` }} title={`${d.count} leads`} />
              <span className="text-[10px] text-graphite-muted">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily table */}
      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-graphite-border"><h2 className="text-sm font-semibold text-foreground">Daily Detail</h2></div>
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !daily.length ? (
          <EmptyState icon={BarChart3} title="No leads yet" description="Lead performance appears once data is imported." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-right px-4 py-2 font-medium">Leads</th>
                  <th className="text-right px-4 py-2 font-medium">Sold</th>
                  <th className="text-right px-4 py-2 font-medium">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {daily.map((d) => (
                  <tr key={d.date}>
                    <td className="px-4 py-2 text-foreground">{d.date}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(d.leads)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(d.sold)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(d.revenue)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${d.netProfit < 0 ? "text-brand-coral" : "text-foreground"}`}>${formatMoney(d.netProfit)}</td>
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