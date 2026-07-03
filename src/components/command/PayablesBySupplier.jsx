import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatMoney, isNegative } from "@/lib/formatters";
import { Progress } from "@/components/ui/progress";
import EmptyState from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function PayablesBySupplier() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ApEntry.list('-date', 50).then(setEntries).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const suppliers = {};
  entries.forEach(e => {
    if (!suppliers[e.supplier]) suppliers[e.supplier] = { accrued: 0, paid: 0 };
    if (e.entry_type === 'payment') suppliers[e.supplier].paid += (e.amount || 0);
    else suppliers[e.supplier].accrued += (e.amount || 0);
  });

  const supplierList = Object.entries(suppliers).map(([name, data]) => ({
    name,
    balance: data.accrued - data.paid,
    accrued: data.accrued,
    paid: data.paid,
    pct: data.accrued > 0 ? Math.min((data.paid / data.accrued) * 100, 100) : 0
  })).sort((a, b) => b.balance - a.balance);

  return (
    <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider">Payables by Supplier</h3>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-graphite-border text-graphite-muted">BOOKED</span>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" />
        </div>
      ) : supplierList.length === 0 ? (
        <EmptyState icon={Users} title="No payables" />
      ) : (
        <div className="space-y-3">
          {supplierList.slice(0, 5).map(s => (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground truncate">{s.name}</span>
                <span className={`font-mono text-sm tabular-nums ${isNegative(s.balance) ? 'text-brand-coral' : 'text-foreground'}`}>
                  ${formatMoney(s.balance)}
                </span>
              </div>
              <Progress value={s.pct} className="h-1.5 bg-graphite-lighter [&>div]:bg-emerald-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}