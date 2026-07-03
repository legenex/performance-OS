import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatMoney } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import EmptyState from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";

export default function WeekVsPlan() {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WeeklyBudget.list('-week_of', 1).then(b => setBudget(b[0] || null)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4 h-48 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" />
    </div>
  );

  if (!budget) return (
    <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
      <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider mb-3">This Week vs Plan</h3>
      <EmptyState icon={BarChart3} title="No weekly budget set" />
    </div>
  );

  const categories = [
    { name: "Media", plan: budget.media_cap || 0, actual: 0 },
    { name: "Owner Draw", plan: budget.owner_draw || 0, actual: 0 },
    { name: "Arrears", plan: budget.arrears_paydown || 0, actual: 0 },
    { name: "Payroll", plan: budget.staff_payroll || 0, actual: 0 },
  ];

  return (
    <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
      <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider mb-3">This Week vs Plan</h3>
      <div className="h-40">
        <ResponsiveContainer>
          <BarChart data={categories} layout="vertical" barGap={2}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={70} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#14171C', border: '1px solid #252830', borderRadius: 8, fontSize: 12, color: '#E5E7EB' }}
              formatter={(v) => ['$' + formatMoney(v)]}
            />
            <Bar dataKey="plan" radius={[0, 3, 3, 0]} fill="#252830" barSize={14} name="Plan" />
            <Bar dataKey="actual" radius={[0, 3, 3, 0]} fill="#E4262C" barSize={14} name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}