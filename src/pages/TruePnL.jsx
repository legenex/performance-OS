import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import MoneyCell from "@/components/shared/MoneyCell";
import EmptyState from "@/components/shared/EmptyState";
import { formatMoney, isNegative } from "@/lib/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3 } from "lucide-react";

export default function TruePnL() {
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [monetization, setMonetization] = useState([]);
  const [bankTxns, setBankTxns] = useState([]);
  const [apEntries, setApEntries] = useState([]);
  const [opex, setOpex] = useState([]);
  const [ownerLedger, setOwnerLedger] = useState([]);
  const [otherIncome, setOtherIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.Lead.filter({ lead_status: 'Sold' }, '-created_date', 50),
      base44.entities.Call.list('-ts', 50),
      base44.entities.MonetizationEvent.list('-conversion_date', 50),
      base44.entities.BankTransaction.list('-date', 50),
      base44.entities.ApEntry.list('-date', 50),
      base44.entities.OpexEntry.list('-date', 50),
      base44.entities.OwnerLedgerEntry.list('-date', 50),
      base44.entities.OtherIncomeEntry.list('-date', 50)
    ]).then(([ld, cl, mon, bt, ap, ox, ol, oi]) => {
      setLeads(ld); setCalls(cl); setMonetization(mon); setBankTxns(bt);
      setApEntries(ap); setOpex(ox); setOwnerLedger(ol); setOtherIncome(oi);
      // Default to latest month
      const months = new Set();
      ld.forEach(l => { if (l.sold_at) months.add(l.sold_at.slice(0, 7)); });
      bt.forEach(t => { if (t.date) months.add(t.date.slice(0, 7)); });
      const sorted = [...months].sort().reverse();
      if (sorted.length > 0) setSelectedMonth(sorted[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => {
    const set = new Set();
    leads.forEach(l => { if (l.sold_at) set.add(l.sold_at.slice(0, 7)); });
    bankTxns.forEach(t => { if (t.date) set.add(t.date.slice(0, 7)); });
    return [...set].sort().reverse();
  }, [leads, bankTxns]);

  const pnl = useMemo(() => {
    const m = selectedMonth;
    if (!m) return null;
    const monthLeads = leads.filter(l => l.sold_at?.startsWith(m));
    const monthCalls = calls.filter(c => c.ts?.startsWith(m));
    const monthMon = monetization.filter(e => e.conversion_date?.startsWith(m));
    const monthBank = bankTxns.filter(t => t.date?.startsWith(m));
    const monthAp = apEntries.filter(e => e.date?.startsWith(m));
    const monthOpex = opex.filter(e => e.date?.startsWith(m));
    const monthOwner = ownerLedger.filter(e => e.date?.startsWith(m));
    const monthOI = otherIncome.filter(e => e.date?.startsWith(m));

    // BOOKED side
    const bookedLeadRevenue = monthLeads.reduce((s, l) => s + (l.lead_net_revenue || 0), 0);
    const bookedCallRevenue = monthCalls.reduce((s, c) => s + (c.payout || 0), 0);
    const bookedMonetization = monthMon.reduce((s, e) => s + (e.revenue || 0), 0);
    const bookedTotalRevenue = bookedLeadRevenue + bookedCallRevenue + bookedMonetization;
    const bookedMedia = monthLeads.reduce((s, l) => s + (l.cost_deduction || 0), 0);
    const bookedSupplierPayout = monthAp.filter(e => e.entry_type === 'accrual').reduce((s, e) => s + (e.amount || 0), 0);
    const bookedPayroll = monthOpex.filter(e => e.category === 'payroll_influxx_sa').reduce((s, e) => s + (e.amount || 0), 0);
    const bookedTools = monthOpex.filter(e => e.category === 'tools_saas').reduce((s, e) => s + (e.amount || 0), 0);
    const bookedContractors = monthOpex.filter(e => e.category === 'contractors').reduce((s, e) => s + (e.amount || 0), 0);
    const bookedFees = monthOpex.filter(e => e.category === 'fees').reduce((s, e) => s + (e.amount || 0), 0);
    const bookedTotalExpenses = bookedMedia + bookedSupplierPayout + bookedPayroll + bookedTools + bookedContractors + bookedFees;
    const bookedOpProfit = bookedTotalRevenue - bookedTotalExpenses;

    // CASH side
    const cashBuyerIncome = monthBank.filter(t => t.category === 'income_buyers').reduce((s, t) => s + (t.amount || 0), 0);
    const cashOtherIncome = monthBank.filter(t => t.category === 'income_other').reduce((s, t) => s + (t.amount || 0), 0) + monthOI.reduce((s, e) => s + (e.amount || 0), 0);
    const cashTotalRevenue = cashBuyerIncome + cashOtherIncome;
    const cashMedia = monthBank.filter(t => (t.category || '').startsWith('media_')).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const cashSupplier = monthAp.filter(e => e.entry_type === 'payment').reduce((s, e) => s + (e.amount || 0), 0);
    const cashPayroll = monthBank.filter(t => t.category === 'payroll_influxx_sa').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const cashTools = monthBank.filter(t => t.category === 'tools_saas').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const cashContractors = monthBank.filter(t => t.category === 'contractors').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const cashFees = monthBank.filter(t => (t.category || '').startsWith('fees_')).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const cashTotalExpenses = cashMedia + cashSupplier + cashPayroll + cashTools + cashContractors + cashFees;
    const cashOpProfit = cashTotalRevenue - cashTotalExpenses;

    // Below the line
    const ownerDraw = monthOwner.filter(e => e.type === 'owner_draw').reduce((s, e) => s + (e.amount || 0), 0);
    const ownerInvestment = monthOwner.filter(e => e.type === 'owner_investment').reduce((s, e) => s + (e.amount || 0), 0);
    const personal = monthOwner.filter(e => e.type === 'personal').reduce((s, e) => s + (e.amount || 0), 0);
    const relatedParty = monthOwner.filter(e => e.type === 'related_party_next').reduce((s, e) => s + (e.amount || 0), 0);

    return {
      booked: {
        leadRevenue: bookedLeadRevenue, callRevenue: bookedCallRevenue, monetization: bookedMonetization,
        totalRevenue: bookedTotalRevenue, media: bookedMedia, supplierPayout: bookedSupplierPayout,
        payroll: bookedPayroll, tools: bookedTools, contractors: bookedContractors, fees: bookedFees,
        totalExpenses: bookedTotalExpenses, opProfit: bookedOpProfit
      },
      cash: {
        buyerIncome: cashBuyerIncome, otherIncome: cashOtherIncome,
        totalRevenue: cashTotalRevenue, media: cashMedia, supplier: cashSupplier,
        payroll: cashPayroll, tools: cashTools, contractors: cashContractors, fees: cashFees,
        totalExpenses: cashTotalExpenses, opProfit: cashOpProfit
      },
      belowLine: { ownerDraw, ownerInvestment, personal, relatedParty }
    };
  }, [selectedMonth, leads, calls, monetization, bankTxns, apEntries, opex, ownerLedger, otherIncome]);

  if (loading) return (
    <div className="h-64 flex items-center justify-center"><div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
  );

  return (
    <div>
      <PageHeader title="True P&L" subtitle="Monthly BOOKED vs CASH side by side" actions={
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36 bg-graphite-panel border-graphite-border text-foreground">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="bg-graphite-panel border-graphite-border">
            {months.map(m => <SelectItem key={m} value={m} className="text-foreground">{m}</SelectItem>)}
          </SelectContent>
        </Select>
      } />

      {!pnl ? (
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <EmptyState icon={BarChart3} title="Select a month" />
        </div>
      ) : (
        <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-graphite-muted uppercase w-1/3">Line Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-graphite-muted uppercase w-1/3">
                  <span className="inline-flex items-center gap-1.5">Booked <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-graphite-border">BOOKED</span></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-graphite-muted uppercase w-1/3">
                  <span className="inline-flex items-center gap-1.5">Cash <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">CASH</span></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue */}
              <PnlSection label="REVENUE" />
              <PnlRow label="Lead Revenue / Buyer Collections" booked={pnl.booked.leadRevenue} cash={pnl.cash.buyerIncome} />
              <PnlRow label="Call Revenue" booked={pnl.booked.callRevenue} cash={null} />
              <PnlRow label="Monetization / Other Income" booked={pnl.booked.monetization} cash={pnl.cash.otherIncome} />
              <PnlTotalRow label="Total Revenue" booked={pnl.booked.totalRevenue} cash={pnl.cash.totalRevenue} />

              {/* Expenses */}
              <PnlSection label="EXPENSES" />
              <PnlRow label="Media" booked={pnl.booked.media} cash={pnl.cash.media} expense />
              <PnlRow label="Supplier Payouts" booked={pnl.booked.supplierPayout} cash={pnl.cash.supplier} expense />
              <PnlRow label="Payroll (Influxx SA)" booked={pnl.booked.payroll} cash={pnl.cash.payroll} expense />
              <PnlRow label="Tools & SaaS" booked={pnl.booked.tools} cash={pnl.cash.tools} expense />
              <PnlRow label="Contractors" booked={pnl.booked.contractors} cash={pnl.cash.contractors} expense />
              <PnlRow label="Fees" booked={pnl.booked.fees} cash={pnl.cash.fees} expense />
              <PnlTotalRow label="Total Expenses" booked={pnl.booked.totalExpenses} cash={pnl.cash.totalExpenses} expense />

              {/* Operating Profit */}
              <PnlTotalRow label="Operating Profit" booked={pnl.booked.opProfit} cash={pnl.cash.opProfit} bold />

              {/* Below the line */}
              <PnlSection label="BELOW THE LINE" />
              <PnlRow label="Owner Draw" booked={null} cash={pnl.belowLine.ownerDraw} expense />
              <PnlRow label="Owner Investment" booked={null} cash={pnl.belowLine.ownerInvestment} />
              <PnlRow label="Personal" booked={null} cash={pnl.belowLine.personal} expense />
              <PnlRow label="Related Party (Next)" booked={null} cash={pnl.belowLine.relatedParty} expense />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PnlSection({ label }) {
  return (
    <tr className="border-b border-graphite-border bg-graphite-lighter/30">
      <td colSpan={3} className="px-4 py-2 text-[10px] font-semibold text-graphite-muted uppercase tracking-widest">{label}</td>
    </tr>
  );
}

function PnlRow({ label, booked, cash, expense }) {
  return (
    <tr className="border-b border-graphite-border/30 hover:bg-graphite-lighter/20">
      <td className="px-4 py-2.5 text-foreground">{label}</td>
      <td className="px-4 py-2.5 text-right">
        {booked != null ? <MoneyCell value={expense ? -booked : booked} basis="booked" /> : <span className="text-graphite-muted">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right">
        {cash != null ? <MoneyCell value={expense ? -cash : cash} basis="cash" /> : <span className="text-graphite-muted">—</span>}
      </td>
    </tr>
  );
}

function PnlTotalRow({ label, booked, cash, expense, bold }) {
  return (
    <tr className={`border-b border-graphite-border ${bold ? 'bg-graphite-lighter/50' : ''}`}>
      <td className={`px-4 py-2.5 ${bold ? 'font-semibold' : 'font-medium'} text-foreground`}>{label}</td>
      <td className="px-4 py-2.5 text-right">
        {booked != null ? (
          <span className={`font-mono tabular-nums ${bold ? 'font-bold text-base' : 'font-medium'} ${isNegative(expense ? -booked : booked) ? 'text-brand-coral' : 'text-foreground'}`}>
            ${formatMoney(expense ? booked : booked)}
          </span>
        ) : <span className="text-graphite-muted">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right">
        {cash != null ? (
          <span className={`font-mono tabular-nums ${bold ? 'font-bold text-base' : 'font-medium'} ${isNegative(expense ? -cash : cash) ? 'text-brand-coral' : 'text-foreground'}`}>
            ${formatMoney(expense ? cash : cash)}
          </span>
        ) : <span className="text-graphite-muted">—</span>}
      </td>
    </tr>
  );
}