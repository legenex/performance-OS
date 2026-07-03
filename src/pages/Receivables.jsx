import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import MoneyCell from "@/components/shared/MoneyCell";
import EmptyState from "@/components/shared/EmptyState";
import { formatMoney, isNegative } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FileText, Plus, Check, Send, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const statusColors = {
  draft: 'bg-graphite-lighter text-graphite-muted border-graphite-border',
  sent: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/30',
  disputed: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export default function Receivables() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bankTxns, setBankTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchDrawer, setMatchDrawer] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.ArInvoice.list('-created_date', 50),
      base44.entities.Lead.filter({ lead_status: 'Sold' }, '-created_date', 50),
      base44.entities.ArPayment.list('-date', 50),
      base44.entities.BankTransaction.filter({ category: 'income_buyers' }, '-date', 20)
    ]).then(([inv, ld, pay, bt]) => {
      setInvoices(inv); setLeads(ld); setPayments(pay); setBankTxns(bt);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function generateDrafts() {
    const byBuyer = {};
    leads.forEach(l => {
      const key = `${l.buyer_name}__${l.billing_cycle || 'default'}`;
      if (!byBuyer[key]) byBuyer[key] = { buyer: l.buyer_name, cycle: l.billing_cycle || 'default', leads: [], total: 0 };
      byBuyer[key].leads.push(l);
      byBuyer[key].total += (l.lead_net_revenue || 0);
    });

    let created = 0;
    for (const group of Object.values(byBuyer)) {
      if (group.total <= 0) continue;
      await base44.entities.ArInvoice.create({
        buyer_name: group.buyer,
        billing_cycle: group.cycle,
        lead_count: group.leads.length,
        amount: group.total,
        status: 'draft',
        period_start: group.leads[group.leads.length - 1]?.sold_at?.slice(0, 10),
        period_end: group.leads[0]?.sold_at?.slice(0, 10),
      });
      created++;
    }
    toast({ title: `${created} draft invoice(s) generated` });
    const refreshed = await base44.entities.ArInvoice.list('-created_date', 50);
    setInvoices(refreshed);
  }

  async function transitionInvoice(inv, newStatus) {
    await base44.entities.ArInvoice.update(inv.id, { status: newStatus, ...(newStatus === 'sent' ? { issued_at: new Date().toISOString() } : {}) });
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: newStatus } : i));
    toast({ title: `Invoice marked as ${newStatus}` });
  }

  // Buyer aging
  const buyerAging = useMemo(() => {
    const result = {};
    invoices.forEach(inv => {
      if (!result[inv.buyer_name]) result[inv.buyer_name] = { invoiced: 0, collected: 0, owed: 0 };
      result[inv.buyer_name].invoiced += (inv.amount || 0);
      if (inv.status === 'paid') result[inv.buyer_name].collected += (inv.amount || 0);
    });
    Object.keys(result).forEach(b => { result[b].owed = result[b].invoiced - result[b].collected; });
    return Object.entries(result).sort((a, b) => b[1].owed - a[1].owed);
  }, [invoices]);

  // Booked vs collected chart
  const varianceChart = useMemo(() => {
    const months = {};
    invoices.forEach(inv => {
      const m = inv.period_end?.slice(0, 7) || inv.created_date?.slice(0, 7) || 'unknown';
      if (!months[m]) months[m] = { month: m, booked: 0, collected: 0 };
      months[m].booked += (inv.amount || 0);
      if (inv.status === 'paid') months[m].collected += (inv.amount || 0);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices]);

  // Payment matching candidates
  function openPaymentMatch(inv) {
    const candidates = bankTxns.filter(t => {
      const amtRatio = Math.abs((t.amount || 0) - (inv.amount || 0)) / Math.max(inv.amount || 1, 1);
      return amtRatio < 0.05;
    });
    setMatchDrawer({ invoice: inv, candidates });
  }

  async function matchPayment(inv, txn) {
    await base44.entities.ArPayment.create({
      invoice_id: inv.id,
      buyer_name: inv.buyer_name,
      amount: txn.amount,
      date: txn.date,
      bank_transaction_id: txn.id,
    });
    await base44.entities.ArInvoice.update(inv.id, { status: 'paid' });
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid' } : i));
    setMatchDrawer(null);
    toast({ title: "Payment matched and invoice marked paid" });
  }

  return (
    <div>
      <PageHeader title="Receivables & Invoicing" subtitle="Invoice generation, aging, and payment matching" actions={
        <Button size="sm" onClick={generateDrafts} className="bg-brand-red hover:bg-brand-red/90 text-white">
          <Plus className="w-4 h-4 mr-1" /> Generate Drafts
        </Button>
      } />

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="bg-graphite-panel border border-graphite-border">
          <TabsTrigger value="invoices" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Invoices</TabsTrigger>
          <TabsTrigger value="aging" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Buyer Aging</TabsTrigger>
          <TabsTrigger value="variance" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Booked vs Collected</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="h-40 flex items-center justify-center"><div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
            ) : invoices.length === 0 ? (
              <EmptyState icon={FileText} title="No invoices" description="Generate drafts from sold leads" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Buyer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Cycle</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-graphite-muted uppercase">Leads</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Due</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-graphite-border/50 hover:bg-graphite-lighter/30">
                      <td className="px-4 py-2.5 text-foreground">{inv.buyer_name}</td>
                      <td className="px-4 py-2.5 text-graphite-muted">{inv.billing_cycle}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-foreground">{inv.lead_count || '—'}</td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={inv.amount} basis="booked" /></td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[inv.status] || statusColors.draft}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-graphite-muted tabular-nums">{inv.due_at || '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {inv.status === 'draft' && (
                            <Button variant="ghost" size="sm" onClick={() => transitionInvoice(inv, 'sent')} className="h-7 text-xs text-graphite-muted hover:text-blue-400">
                              <Send className="w-3 h-3 mr-1" /> Issue
                            </Button>
                          )}
                          {inv.status === 'sent' && (
                            <Button variant="ghost" size="sm" onClick={() => openPaymentMatch(inv)} className="h-7 text-xs text-graphite-muted hover:text-emerald-400">
                              <DollarSign className="w-3 h-3 mr-1" /> Match
                            </Button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'partial') && (
                            <Button variant="ghost" size="sm" onClick={() => transitionInvoice(inv, 'paid')} className="h-7 text-xs text-graphite-muted hover:text-emerald-400">
                              <Check className="w-3 h-3 mr-1" /> Paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="aging">
          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            {buyerAging.length === 0 ? (
              <EmptyState title="No buyer aging data" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Buyer</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Invoiced</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Collected</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerAging.map(([buyer, data]) => (
                    <tr key={buyer} className="border-b border-graphite-border/50">
                      <td className="px-4 py-2.5 text-foreground">{buyer}</td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={data.invoiced} basis="booked" /></td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={data.collected} basis="cash" /></td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={data.owed} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="variance">
          <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
            {varianceChart.length === 0 ? (
              <EmptyState title="No data for chart" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={varianceChart}>
                    <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'K'} />
                    <Tooltip contentStyle={{ background: '#14171C', border: '1px solid #252830', borderRadius: 8, fontSize: 12, color: '#E5E7EB' }} formatter={v => ['$' + formatMoney(v)]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
                    <Bar dataKey="booked" name="Booked" fill="#E4262C" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#10B981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment matching drawer */}
      <Sheet open={!!matchDrawer} onOpenChange={() => setMatchDrawer(null)}>
        <SheetContent side="right" className="bg-graphite-panel border-graphite-border w-96">
          <SheetHeader>
            <SheetTitle className="text-foreground">Match Payment</SheetTitle>
          </SheetHeader>
          {matchDrawer && (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-graphite-muted">Invoice: <span className="text-foreground">{matchDrawer.invoice.buyer_name}</span> — ${formatMoney(matchDrawer.invoice.amount)}</div>
              <div className="text-xs text-graphite-muted mb-2">Candidates within ±5% amount:</div>
              {matchDrawer.candidates.length === 0 ? (
                <p className="text-sm text-graphite-muted">No matching transactions found.</p>
              ) : (
                matchDrawer.candidates.map(txn => (
                  <button key={txn.id} onClick={() => matchPayment(matchDrawer.invoice, txn)} className="w-full flex items-center justify-between p-3 rounded-lg bg-graphite-lighter hover:bg-graphite-border transition-colors text-left">
                    <div>
                      <div className="text-sm text-foreground">{txn.description}</div>
                      <div className="text-xs text-graphite-muted">{txn.date}</div>
                    </div>
                    <span className="font-mono text-sm tabular-nums text-emerald-400">${formatMoney(txn.amount)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}