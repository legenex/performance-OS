import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatMoney } from "@/lib/formatters";
import EmptyState from "@/components/shared/EmptyState";
import { FileText } from "lucide-react";

export default function ReceivablesAging() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ArInvoice.filter({}).then(setInvoices).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const unpaid = invoices.filter(i => i.status !== 'paid');
  const now = new Date();
  const buckets = { current: 0, '1-30': 0, '31-60': 0, '61+': 0 };
  const debtorTotals = {};

  unpaid.forEach(inv => {
    const due = new Date(inv.due_at);
    const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
    const amt = inv.amount || 0;
    if (days <= 0) buckets.current += amt;
    else if (days <= 30) buckets['1-30'] += amt;
    else if (days <= 60) buckets['31-60'] += amt;
    else buckets['61+'] += amt;
    debtorTotals[inv.buyer_name] = (debtorTotals[inv.buyer_name] || 0) + amt;
  });

  const topDebtor = Object.entries(debtorTotals).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider">Receivables Aging</h3>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-graphite-border text-graphite-muted">BOOKED</span>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" />
        </div>
      ) : unpaid.length === 0 ? (
        <EmptyState icon={FileText} title="No outstanding invoices" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {Object.entries(buckets).map(([label, val]) => (
              <div key={label} className="text-center">
                <div className="text-[10px] text-graphite-muted mb-1">{label}</div>
                <div className="font-mono text-sm tabular-nums text-foreground">${formatMoney(val)}</div>
              </div>
            ))}
          </div>
          {topDebtor && (
            <div className="border-t border-graphite-border pt-2 text-xs text-graphite-muted">
              Top debtor: <span className="text-foreground font-medium">{topDebtor[0]}</span> — ${formatMoney(topDebtor[1])}
            </div>
          )}
        </>
      )}
    </div>
  );
}