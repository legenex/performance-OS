import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ExportButton from "@/components/shared/ExportButton";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { Target } from "lucide-react";

export default function CampaignTrueMargin() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const [leads, setLeads] = useState([]);
  const [spend, setSpend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.Lead.list("-created_at", 5000),
      base44.entities.AdSpend.filter({ superseded: false }, "-date", 3000),
    ]).then(([l, s]) => { if (alive) { setLeads(l); setSpend(s); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    const src = leads.filter((l) => includeTest || !l.is_test);
    const map = {};
    src.forEach((l) => {
      const k = l.utm_campaign || l.supplier_source || "Direct";
      map[k] = map[k] || { campaign: k, leads: 0, sold: 0, revenue: 0, cost: 0 };
      map[k].leads++;
      if (l.lead_status === "Sold") map[k].sold++;
      map[k].revenue += l.lead_revenue || 0;
      map[k].cost += l.cost_deduction || 0;
    });
    // Add ad spend by campaign
    spend.forEach((s) => {
      const k = s.campaign || "Direct";
      map[k] = map[k] || { campaign: k, leads: 0, sold: 0, revenue: 0, cost: 0 };
      map[k].cost += s.cost || 0;
    });
    return Object.values(map).map((c) => ({
      ...c,
      margin: c.revenue - c.cost,
      trueCpl: c.leads ? c.cost / c.leads : 0,
      soldCpl: c.sold ? c.cost / c.sold : 0,
      roas: c.cost ? c.revenue / c.cost : 0,
    })).sort((a, b) => b.margin - a.margin);
  }, [leads, spend, includeTest]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Campaign True Margin"
        subtitle="Revenue minus allocated media cost per campaign — the honest number"
        actions={rows.length ? <ExportButton filename="campaign-true-margin" rows={rows} columns={[
          { key: "campaign", label: "Campaign" }, { key: "leads", label: "Leads" }, { key: "sold", label: "Sold" },
          { key: "cost", label: "Media Cost" }, { key: "revenue", label: "Revenue" }, { key: "margin", label: "True Margin" },
          { key: "trueCpl", label: "True CPL" }, { key: "soldCpl", label: "Sold CPL" }, { key: "roas", label: "ROAS" },
        ]} /> : null}
      />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !rows.length ? (
          <EmptyState icon={Target} title="No campaign data" description="Campaign margin appears once leads and ad spend are present." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Campaign</th>
                  <th className="text-right px-4 py-2 font-medium">Leads</th>
                  <th className="text-right px-4 py-2 font-medium">Sold</th>
                  <th className="text-right px-4 py-2 font-medium">Media Cost</th>
                  <th className="text-right px-4 py-2 font-medium">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium">True CPL</th>
                  <th className="text-right px-4 py-2 font-medium">ROAS</th>
                  <th className="text-right px-4 py-2 font-medium">True Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {rows.map((c) => (
                  <tr key={c.campaign} className="hover:bg-graphite-elevated/40">
                    <td className="px-4 py-2 text-foreground font-medium truncate max-w-[240px]">{c.campaign}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(c.leads)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(c.sold)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(c.cost)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(c.revenue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${c.trueCpl ? c.trueCpl.toFixed(2) : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{c.roas ? c.roas.toFixed(2) + "x" : "—"}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${c.margin < 0 ? "text-brand-coral" : "text-emerald-400"}`}>${formatMoney(c.margin)}</td>
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