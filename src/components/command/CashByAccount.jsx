import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatMoney, isNegative } from "@/lib/formatters";
import { Landmark } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default function CashByAccount() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BankAccount.list().then(setAccounts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const total = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  return (
    <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider">Cash by Account</h3>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">CASH</span>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState icon={Landmark} title="No bank accounts" description="Add accounts in Cash & Banking" />
      ) : (
        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-foreground">{acc.name}</span>
              <span className={`font-mono text-sm tabular-nums ${isNegative(acc.current_balance) ? 'text-brand-coral' : 'text-foreground'}`}>
                ${formatMoney(acc.current_balance)}
              </span>
            </div>
          ))}
          <div className="border-t border-graphite-border pt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className={`font-mono text-sm font-bold tabular-nums ${isNegative(total) ? 'text-brand-coral' : 'text-foreground'}`}>
              ${formatMoney(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}