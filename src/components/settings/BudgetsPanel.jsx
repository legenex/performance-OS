import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/shared/EmptyState";
import { formatMoney } from "@/lib/formatters";
import { Gauge } from "lucide-react";

export default function BudgetsPanel() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WeeklyBudget.list("-week_of", 26).then(setBudgets).catch(() => setBudgets([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-graphite-muted">Weekly media caps, owner draw and paydown thresholds.</p>
      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !budgets.length ? (
          <EmptyState icon={Gauge} title="No budgets set" description="Weekly budgets appear here once configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Week Of</th>
                  <th className="text-right px-4 py-2 font-medium">Media Cap</th>
                  <th className="text-right px-4 py-2 font-medium">Owner Draw</th>
                  <th className="text-right px-4 py-2 font-medium">Arrears Paydown</th>
                  <th className="text-right px-4 py-2 font-medium">Staff Payroll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {budgets.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-foreground">{b.week_of}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(b.media_cap)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(b.owner_draw)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(b.arrears_paydown)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">${formatMoney(b.staff_payroll)}</td>
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