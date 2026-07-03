import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import MoneyCell from "@/components/shared/MoneyCell";
import EmptyState from "@/components/shared/EmptyState";
import { formatMoney, isNegative } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Landmark, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = [
  "income_buyers", "income_other", "media_facebook", "media_google", "media_tiktok", "media_other",
  "supplier_payout", "payroll_influxx_sa", "tools_saas", "contractors", "fees_bank",
  "fees_processing", "owner_draw", "owner_investment", "personal", "related_party_next", "uncategorized"
];

export default function CashBanking() {
  const { toast } = useToast();
  const [txns, setTxns] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ pattern: "", category: "", counterparty: "", priority: 10 });
  const [editingTxn, setEditingTxn] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.BankTransaction.list('-date', 50),
      base44.entities.CategorizationRule.list('-priority', 50)
    ]).then(([t, r]) => { setTxns(t); setRules(r); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const uncategorizedCount = txns.filter(t => !t.category || t.category === 'uncategorized').length;

  const filtered = useMemo(() => {
    if (!search) return txns;
    const q = search.toLowerCase();
    return txns.filter(t => t.description?.toLowerCase().includes(q) || t.counterparty?.toLowerCase().includes(q));
  }, [txns, search]);

  async function updateCategory(txnId, category) {
    await base44.entities.BankTransaction.update(txnId, { category });
    setTxns(prev => prev.map(t => t.id === txnId ? { ...t, category } : t));
    toast({ title: "Category updated" });
  }

  async function createRuleFromTxn(txn, category) {
    setRuleForm({ pattern: txn.description || "", category, counterparty: txn.counterparty || "", priority: 10 });
    setRuleDialogOpen(true);
  }

  async function saveRule() {
    const created = await base44.entities.CategorizationRule.create(ruleForm);
    setRules(prev => [...prev, created]);
    setRuleDialogOpen(false);
    toast({ title: "Rule created" });
  }

  async function deleteRule(id) {
    await base44.entities.CategorizationRule.delete(id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast({ title: "Rule deleted" });
  }

  // Cash flow matrix: categories × months
  const monthMatrix = useMemo(() => {
    const months = {};
    const catTotals = {};
    txns.forEach(t => {
      const m = t.date?.slice(0, 7) || 'unknown';
      const cat = t.category || 'uncategorized';
      if (!months[m]) months[m] = {};
      if (!months[m][cat]) months[m][cat] = 0;
      months[m][cat] += (t.amount || 0);
      catTotals[cat] = (catTotals[cat] || 0) + (t.amount || 0);
    });
    const sortedMonths = Object.keys(months).sort();
    const usedCats = Object.keys(catTotals).sort();
    return { months, sortedMonths, usedCats, catTotals };
  }, [txns]);

  return (
    <div>
      <PageHeader title="Cash & Banking" subtitle="Transaction ledger and categorization" actions={
        <div className="flex items-center gap-2">
          {uncategorizedCount > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
              <AlertCircle className="w-3 h-3 mr-1" />{uncategorizedCount} uncategorized
            </Badge>
          )}
        </div>
      } />

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-graphite-panel border border-graphite-border">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Transactions</TabsTrigger>
          <TabsTrigger value="rules" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Rules</TabsTrigger>
          <TabsTrigger value="matrix" className="data-[state=active]:bg-graphite-lighter data-[state=active]:text-foreground text-graphite-muted">Cash Flow Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-muted" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." className="pl-9 bg-graphite-panel border-graphite-border text-foreground placeholder:text-graphite-muted" />
            </div>
          </div>

          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="h-40 flex items-center justify-center"><div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Landmark} title="No transactions" description="Import bank transactions to get started" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-graphite-muted uppercase">Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Category</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Counterparty</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(txn => (
                    <tr key={txn.id} className="border-b border-graphite-border/50 hover:bg-graphite-lighter/30 transition-colors">
                      <td className="px-4 py-2.5 text-foreground tabular-nums">{txn.date}</td>
                      <td className="px-4 py-2.5 text-foreground truncate max-w-xs">{txn.description}</td>
                      <td className="px-4 py-2.5 text-right"><MoneyCell value={txn.amount} basis="cash" /></td>
                      <td className="px-4 py-2.5">
                        <Select value={txn.category || 'uncategorized'} onValueChange={val => {
                          updateCategory(txn.id, val);
                          if (val !== 'uncategorized') createRuleFromTxn(txn, val);
                        }}>
                          <SelectTrigger className="h-7 w-40 text-xs bg-graphite-lighter border-graphite-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-graphite-panel border-graphite-border">
                            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-foreground text-xs">{c.replace(/_/g, ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2.5 text-graphite-muted">{txn.counterparty || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <div className="mb-4">
            <Button size="sm" onClick={() => { setRuleForm({ pattern: '', category: '', counterparty: '', priority: 10 }); setRuleDialogOpen(true); }} className="bg-brand-red hover:bg-brand-red/90 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Rule
            </Button>
          </div>
          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            {rules.length === 0 ? (
              <EmptyState title="No rules" description="Create categorization rules to auto-tag transactions" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Pattern</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Category</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-graphite-muted uppercase">Counterparty</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-graphite-muted uppercase">Priority</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id} className="border-b border-graphite-border/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">{rule.pattern}</td>
                      <td className="px-4 py-2.5 text-foreground">{rule.category?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5 text-graphite-muted">{rule.counterparty || '—'}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-foreground">{rule.priority}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="text-graphite-muted hover:text-red-400 h-7 text-xs">Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-x-auto">
            {monthMatrix.sortedMonths.length === 0 ? (
              <EmptyState title="No data for matrix" />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-graphite-border">
                    <th className="px-3 py-2 text-left font-medium text-graphite-muted uppercase sticky left-0 bg-graphite-panel">Category</th>
                    {monthMatrix.sortedMonths.map(m => <th key={m} className="px-3 py-2 text-right font-medium text-graphite-muted">{m}</th>)}
                    <th className="px-3 py-2 text-right font-medium text-graphite-muted uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthMatrix.usedCats.map(cat => (
                    <tr key={cat} className="border-b border-graphite-border/30">
                      <td className="px-3 py-2 text-foreground sticky left-0 bg-graphite-panel">{cat.replace(/_/g, ' ')}</td>
                      {monthMatrix.sortedMonths.map(m => {
                        const val = monthMatrix.months[m]?.[cat] || 0;
                        return <td key={m} className={`px-3 py-2 text-right tabular-nums ${isNegative(val) ? 'text-brand-coral' : 'text-foreground'}`}>${formatMoney(val)}</td>;
                      })}
                      <td className={`px-3 py-2 text-right font-medium tabular-nums ${isNegative(monthMatrix.catTotals[cat]) ? 'text-brand-coral' : 'text-foreground'}`}>
                        ${formatMoney(monthMatrix.catTotals[cat])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Rule creation dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="bg-graphite-panel border-graphite-border text-foreground">
          <DialogHeader><DialogTitle>Create Categorization Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-graphite-muted mb-1 block">Pattern (matched against description)</label>
              <Input value={ruleForm.pattern} onChange={e => setRuleForm(p => ({ ...p, pattern: e.target.value }))} className="bg-graphite-lighter border-graphite-border" />
            </div>
            <div>
              <label className="text-xs text-graphite-muted mb-1 block">Category</label>
              <Select value={ruleForm.category} onValueChange={val => setRuleForm(p => ({ ...p, category: val }))}>
                <SelectTrigger className="bg-graphite-lighter border-graphite-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-graphite-panel border-graphite-border">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-foreground text-xs">{c.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-graphite-muted mb-1 block">Counterparty</label>
              <Input value={ruleForm.counterparty} onChange={e => setRuleForm(p => ({ ...p, counterparty: e.target.value }))} className="bg-graphite-lighter border-graphite-border" />
            </div>
            <div>
              <label className="text-xs text-graphite-muted mb-1 block">Priority</label>
              <Input type="number" value={ruleForm.priority} onChange={e => setRuleForm(p => ({ ...p, priority: Number(e.target.value) }))} className="bg-graphite-lighter border-graphite-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRuleDialogOpen(false)} className="text-graphite-muted">Cancel</Button>
            <Button onClick={saveRule} className="bg-brand-red hover:bg-brand-red/90 text-white">Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}