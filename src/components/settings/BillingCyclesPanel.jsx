import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/shared/EmptyState";
import { CalendarClock } from "lucide-react";

export default function BillingCyclesPanel() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Buyer.list("name", 200).then(setBuyers).catch(() => setBuyers([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-graphite-muted">Billing terms per buyer. Edit these in OPS → Buyers.</p>
      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !buyers.length ? (
          <EmptyState icon={CalendarClock} title="No billing cycles" description="Add buyers to configure billing cycles." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-graphite-well text-graphite-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Buyer</th>
                  <th className="text-left px-4 py-2 font-medium">Billing Terms</th>
                  <th className="text-left px-4 py-2 font-medium">Active States</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {buyers.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-foreground font-medium">{b.name}</td>
                    <td className="px-4 py-2 text-graphite-muted">{b.billing_terms || "—"}</td>
                    <td className="px-4 py-2 text-graphite-muted">{b.active_states || "all"}</td>
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