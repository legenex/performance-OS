import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { CreditCard, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

function dayStr(d) { return d.toISOString().slice(0, 10); }

export default function AdAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [spendByAcct, setSpendByAcct] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [accts, spend, runs] = await Promise.all([
        base44.entities.AdAccount.list("-created_date", 100),
        base44.entities.AdSpend.filter({ date: dayStr(new Date()), superseded: false }),
        base44.entities.SyncRun.list("-started_at", 100),
      ]);
      const map = {};
      for (const s of spend) {
        const k = s.account_id || s.account_name;
        map[k] = map[k] || { spend: 0 };
        map[k].spend += s.cost || 0;
      }
      // attach last sync per platform
      for (const a of accts) {
        const run = runs.find((r) => (r.source || "").toLowerCase().includes((a.platform || "").toLowerCase()));
        map[a.account_id] = map[a.account_id] || { spend: 0 };
        map[a.account_id].lastSync = run?.finished_at || run?.started_at;
      }
      setSpendByAcct(map);
      setAccounts(accts);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Ad Accounts" subtitle="Connected media accounts and their honest capabilities" />

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
      ) : !accounts.length ? (
        <EmptyState icon={CreditCard} title="No ad accounts registered" description="Register accounts to track spend and connection status." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((a) => {
            const info = spendByAcct[a.account_id] || {};
            const owned = a.account_class === "owned_api";
            const connected = (a.connection_status || "").toLowerCase() === "connected";
            return (
              <div key={a.id} className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{a.name || a.account_id}</div>
                    <div className="text-xs text-graphite-muted">{a.platform} · {a.business_manager || "—"}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                    connected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-brand-red/10 text-brand-red border-brand-red/40'
                  }`}>
                    {connected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {a.connection_status || "disconnected"}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-xl font-bold text-foreground">${formatMoney(info.spend || 0)}</span>
                  <span className="text-xs text-graphite-muted">spend today</span>
                </div>
                <div className="text-[11px] text-graphite-muted mt-1">
                  Last sync: {info.lastSync ? new Date(info.lastSync).toLocaleString() : "never"}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${owned ? 'bg-chart-3/15 text-chart-3 border-chart-3/30' : 'bg-graphite-lighter text-graphite-muted border-graphite-border'}`}>
                    {owned ? "OWNED · API" : "PARTNER · spend-only"}
                  </span>
                  {a.default_supplier_sid && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-graphite-lighter text-graphite-muted border border-graphite-border">{a.default_supplier_sid}</span>}
                </div>

                {!owned && (
                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-graphite-muted bg-graphite-base border border-graphite-border rounded p-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Partner account: spend totals only. No campaign/ad-set/ad drill-down or creative-level attribution available.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}