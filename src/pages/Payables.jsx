import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import MoneyCell from "@/components/shared/MoneyCell";
import EmptyState from "@/components/shared/EmptyState";
import { formatMoney, isNegative, formatPct } from "@/lib/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle } from "lucide-react";

export default function Payables() {
  const [entries, setEntries] = useState([]);
  const [adSpend, setAdSpend] = useState([]);
  const [bankTxns, setBankTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ApEntry.list('-date', 50),
      base44.entities.AdSpend.filter({ superseded: false }, '-date', 50),
      base44.entities.BankTransaction.list('-date', 50)
    ]).then(([ap, ad, bt]) => { setEntries(ap); setAdSpend(ad); setBankTxns(bt); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Per-supplier statement
  const supplierStatements = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!map[e.supplier]) map[e.supplier] = { opening: 0, accruals: 0, adjustments: 0, payments: 0, items: [] };
      const s = map[e.supplier];
      s.items.push(e);
      if (e.entry_type === 'opening') s.opening += (e.amount || 0);
      else if (e.entry_type === 'accrual' || e.entry_type === 'supplier_statement') s.accruals += (e.amount || 0);
      else if (e.entry_type === 'adjustment') s.adjustments += (e.amount || 0);
      else if (e.entry_type === 'payment') s.payments += (e.amount || 0);
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      balance: data.opening + data.accruals + data.adjustments - data.payments,
    })).sort((a, b) => b.balance - a.balance);
  }, [entries]);

  const totalArrears = supplierStatements.reduce((s, sup) => s + Math.max(sup.balance, 0), 0);

  // Statement reconciliation: our accruals vs supplier_statement entries by month
  const reconData = useMemo(() => {
    const bySupMonth = {};
    entries.forEach(e => {
      const m = e.date?.slice(0, 7) || 'unknown';
      const key = `${e.supplier}__${m}`;
      if (!bySupMonth[key]) bySupMonth[key] = { supplier: e.supplier, month: m, ours: 0, theirs: 0 };
      if (e.entry_type === 'accrual') bySupMonth[key].ours += (e.amount || 0);
      if (e.entry_type === 'supplier_statement') bySupMonth[key].theirs += (e.amount || 0);
    });
    return Object.values(bySupMonth).filter(r => r.ours > 0 || r.theirs > 0).map(r => ({
      ...r,
      variance: r.theirs > 0 ? ((r.ours - r.theirs) / r.theirs) * 100 : 0
    }));
  }, [entries]);

  // Media gap: tracked AdSpend vs bank media categories
  const mediaGap = useMemo(() => {
    const byPlatformMonth = {};
    adSpend.forEach(a => {
      const m = a.date?.slice(0, 7) || 'unknown';
      const key = `${a.platform}__${m}`;
      if (!byPlatformMonth[key]) byPlatformMonth[key] = { platform: a.platform, month: m, tracked: 0, bank: 0 };
      byPlatformMonth[key].tracked += (a.cost || 0);
    });
    bankTxns.forEach(t => {
      const cat = t.category || '';
      if (!cat.startsWith('media_')) return;
      const platform = cat.replace('media_', '');
      const m = t.date?.slice(0, 7) || 'unknown';
      const key = `${platform}__${m}`;
      if (!byPlatformMonth[key]) byPlatformMonth[key] = { platform, month: m, tracked: 0, bank: 0 };
      byPlatformMonth[key].bank += Math.abs(t.amount || 0);
    });
    return Object.values(byPlatformMonth).map(r => ({
      ...r,
      gap: r.tracked - r.bank,
      isRed: Math.abs(r.tracked - r.bank) > 2000
    }));
  }, [adSpend, bankTxns]);

  return (
    <div>
      <PageHeader title="Payables & Supplier Ledger" subtitle={`Total arrears: $${formatMoney(totalArrears)}`} />

      <Tabs defaultValue="statements" className="space-y-4">
        <TabsList className="bg-graphite-panel border border-graphite-border">
          <TabsTrigger value="statements" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Supplier Statements</TabsTrigger>
          <TabsTrigger value="recon" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Reconciliation</TabsTrigger>
          <TabsTrigger value="mediagap" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Media Gap</TabsTrigger>
        </TabsList>

        <TabsContent value="statements">
          {loading ? (
            <div className="h-40 flex items-center justify-center"><div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
          ) : supplierStatements.length === 0 ? (
            <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
              <EmptyState icon={Users} title="No supplier entries" />
            </div>
          ) : (
            <div className="space-y-3">
              {supplierStatements.map(sup => {
                const paidPct = (sup.opening + sup.accruals + sup.adjustments) > 0
                  ? Math.min((sup.payments / (sup.opening + sup.accruals + sup.adjustments)) * 100, 100) : 0;
                return (
                  <div key={sup.name} className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-foreground">{sup.name}</h4>
                      <span className={`font-mono text-sm font-bold tabular-nums ${isNegative(sup.balance) ? 'text-brand-coral' : sup.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ${formatMoney(sup.balance)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                      <div><span className="text-graphite-muted">Opening</span><div className="font-mono tabular-nums text-foreground">${formatMoney(sup.opening)}</div></div>
                      <div><span className="text-graphite-muted">Accruals</span><div className="font-mono tabular-nums text-foreground">+${formatMoney(sup.accruals)}</div></div>
                      <div><span className="text-graphite-muted">Adjustments</span><div className="font-mono tabular-nums text-foreground">${formatMoney(sup.adjustments)}</div></div>
                      <div><span className="text-graphite-muted">Payments</span><div className="font-mono tabular-nums text-emerald-400">−${formatMoney(sup.payments)}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={paidPct} className="h-1.5 flex-1 bg-graphite-lighter [&>div]:bg-emerald-500" />
                      <span className="text-[10px] tabular-nums text-graphite-muted">{paidPct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recon">
          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            {reconData.length === 0 ? (
              <EmptyState title="No reconciliation data" description="Import supplier statements to compare" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Supplier</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Our Accrual</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Their Statement</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {reconData.map((r, i) => (
                    <tr key={i} className="border-b border-graphite-border/50">
                      <td className="px-4 py-2.5 text-foreground">{r.supplier}</td>
                      <td className="px-4 py-2.5 text-graphite-muted">{r.month}</td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={r.ours} basis="booked" /></td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={r.theirs} /></td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-mono ${Math.abs(r.variance) > 2 ? 'text-amber-400' : 'text-graphite-muted'}`}>
                        {formatPct(r.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="mediagap">
          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            {mediaGap.length === 0 ? (
              <EmptyState title="No media gap data" description="Import ad spend and tag bank transactions" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Platform</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Tracked</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Bank</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {mediaGap.map((r, i) => (
                    <tr key={i} className={`border-b border-graphite-border/50 ${r.isRed ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-2.5 text-foreground capitalize">{r.platform}</td>
                      <td className="px-4 py-2.5 text-graphite-muted">{r.month}</td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={r.tracked} basis="booked" /></td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={r.bank} basis="cash" /></td>
                      <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${r.isRed ? 'text-red-400 font-medium' : isNegative(r.gap) ? 'text-brand-coral' : 'text-foreground'}`}>
                        {r.isRed && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        ${formatMoney(r.gap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}