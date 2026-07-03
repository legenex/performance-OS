import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ExportButton from "@/components/shared/ExportButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { Table2 } from "lucide-react";

const DIMENSIONS = [
  { value: "supplier_sid", label: "Supplier" },
  { value: "buyer_name", label: "Buyer" },
  { value: "lead_vertical", label: "Vertical" },
  { value: "accident_state", label: "State" },
  { value: "utm_campaign", label: "Campaign" },
  { value: "lead_status", label: "Status" },
];

const MEASURES = [
  { value: "leads", label: "Leads (count)" },
  { value: "sold", label: "Sold (count)" },
  { value: "revenue", label: "Revenue" },
  { value: "netProfit", label: "Net Profit" },
];

export default function ReportBuilder() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dim, setDim] = useState("supplier_sid");
  const [measure, setMeasure] = useState("revenue");

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
      const k = l[dim] || "—";
      map[k] = map[k] || { key: k, leads: 0, sold: 0, revenue: 0, netProfit: 0 };
      map[k].leads++;
      if (l.lead_status === "Sold") map[k].sold++;
      map[k].revenue += l.lead_revenue || 0;
      map[k].netProfit += l.net_profit || 0;
    });
    return Object.values(map).sort((a, b) => b[measure] - a[measure]);
  }, [leads, includeTest, dim, measure]);

  const isMoney = measure === "revenue" || measure === "netProfit";
  const dimLabel = DIMENSIONS.find((d) => d.value === dim)?.label;
  const measLabel = MEASURES.find((m) => m.value === measure)?.label;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report Builder"
        subtitle="Pick a dimension and a measure to build an ad-hoc pivot"
        actions={rows.length ? <ExportButton filename="report" rows={rows} columns={[
          { key: "key", label: dimLabel }, { key: "leads", label: "Leads" }, { key: "sold", label: "Sold" },
          { key: "revenue", label: "Revenue" }, { key: "netProfit", label: "Net Profit" },
        ]} /> : null}
      />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4 flex flex-wrap gap-4">
        <div>
          <label className="text-xs text-graphite-muted uppercase tracking-wider mb-1.5 block">Group by</label>
          <Select value={dim} onValueChange={setDim}>
            <SelectTrigger className="w-48 bg-graphite-well border-graphite-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-graphite-elevated border-graphite-border">
              {DIMENSIONS.map((d) => <SelectItem key={d.value} value={d.value} className="text-foreground">{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-graphite-muted uppercase tracking-wider mb-1.5 block">Sort by</label>
          <Select value={measure} onValueChange={setMeasure}>
            <SelectTrigger className="w-48 bg-graphite-well border-graphite-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-graphite-elevated border-graphite-border">
              {MEASURES.map((m) => <SelectItem key={m.value} value={m.value} className="text-foreground">{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !rows.length ? (
          <EmptyState icon={Table2} title="No data" description="Import leads to build reports." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">{dimLabel}</th>
                  <th className="text-right px-4 py-2 font-medium">Leads</th>
                  <th className="text-right px-4 py-2 font-medium">Sold</th>
                  <th className="text-right px-4 py-2 font-medium">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {rows.map((r) => (
                  <tr key={r.key} className="hover:bg-graphite-elevated/40">
                    <td className="px-4 py-2 text-foreground font-medium">{r.key}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(r.leads)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(r.sold)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(r.revenue)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${r.netProfit < 0 ? "text-brand-coral" : "text-foreground"}`}>${formatMoney(r.netProfit)}</td>
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