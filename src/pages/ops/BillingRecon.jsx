import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { Receipt } from "lucide-react";

export default function BillingRecon() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.entities.ArInvoice.list("-issued_at", 500)
      .then((r) => { if (alive) setInvoices(r); })
      .catch(() => { if (alive) setInvoices([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const byStatus = useMemo(() => {
    const map = {};
    invoices.forEach((i) => {
      const s = i.status || "draft";
      map[s] = map[s] || { status: s, count: 0, amount: 0 };
      map[s].count++;
      map[s].amount += i.amount || 0;
    });
    return Object.values(map);
  }, [invoices]);

  const total = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const outstanding = invoices.filter((i) => ["sent", "partial", "overdue", "disputed"].includes(i.status)).reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Billing & Recon" subtitle="Invoice status reconciliation across billing cycles" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">Invoices</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-foreground">{formatNumber(invoices.length)}</div>
        </div>
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">Total Billed</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-foreground">${formatMoney(total)}</div>
        </div>
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">Outstanding</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-brand-coral">${formatMoney(outstanding)}</div>
        </div>
      </div>

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-graphite-border"><h2 className="text-sm font-semibold text-foreground">By Status</h2></div>
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !invoices.length ? (
          <EmptyState icon={Receipt} title="No invoices" description="Invoices appear once billing cycles run." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Count</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {byStatus.map((s) => (
                  <tr key={s.status}>
                    <td className="px-4 py-2 text-foreground capitalize">{s.status}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatNumber(s.count)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(s.amount)}</td>
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