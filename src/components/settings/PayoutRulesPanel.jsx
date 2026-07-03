import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/shared/EmptyState";
import { Coins } from "lucide-react";

export default function PayoutRulesPanel() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Supplier.list("sid", 200).then(setSuppliers).catch(() => setSuppliers([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-graphite-muted">Payout model and value per supplier. Edit these in OPS → Suppliers.</p>
      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !suppliers.length ? (
          <EmptyState icon={Coins} title="No payout rules" description="Add suppliers to configure payouts." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Supplier</th>
                  <th className="text-left px-4 py-2 font-medium">Model</th>
                  <th className="text-right px-4 py-2 font-medium">Value</th>
                  <th className="text-center px-4 py-2 font-medium">Clawback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-foreground font-medium">{s.sid} <span className="text-graphite-muted font-normal">— {s.name}</span></td>
                    <td className="px-4 py-2 text-graphite-muted">{s.payout_model || "none"}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{s.payout_value ?? "—"}</td>
                    <td className="px-4 py-2 text-center">{s.clawback_on_return ? "✓" : "—"}</td>
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