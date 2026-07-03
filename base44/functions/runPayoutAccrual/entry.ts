import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Per-list override rules keyed by supplier SID. Falls back to supplier.payout_model.
const LIST_OVERRIDES = {
  'INBNDS-SURVEY': { type: 'pct_lead_revenue', value: 0.70, on: 'Sold' },
  'LGNX-FCH': { type: 'pct_monetization', value: 0.60 },
  'INBNDS-PVL': { type: 'flat', value: 230, on: 'Sold' },
  'TFISH': { type: 'flat_per_post', value: 225 },
  'LEADFLOW': { type: 'pct_net_profit', value: 0.30 },
  'LOL': { type: 'pct_net_profit', value: 0.20 },
  'COD': { type: 'flat', value: 150, on: 'Sold' },
};
const PAYABLE_STATES = ['Sold', 'Returned'];

function payoutForLead(lead, supplier) {
  const sid = lead.supplier_sid || '';
  const rule = LIST_OVERRIDES[sid];
  if (rule) {
    if (rule.type === 'pct_lead_revenue' && lead.lead_status === 'Sold') return (lead.lead_revenue || 0) * rule.value;
    if (rule.type === 'flat' && lead.lead_status === (rule.on || 'Sold')) return rule.value;
    if (rule.type === 'flat_per_post' && lead.lead_status === 'Sold') return rule.value;
    if (rule.type === 'pct_net_profit') {
      const base = (lead.lead_net_revenue || 0) - (lead.cost_deduction || 0);
      return base * rule.value;
    }
  }
  // Supplier model fallback
  if (supplier) {
    if (supplier.payout_model === 'revshare_revenue' && lead.lead_status === 'Sold') return (lead.lead_revenue || 0) * (supplier.payout_value || 0);
    if (supplier.payout_model === 'revshare_net_profit') return ((lead.lead_net_revenue || 0) - (lead.cost_deduction || 0)) * (supplier.payout_value || 0);
    if (supplier.payout_model === 'flat_accepted' && lead.lead_status === 'Sold') return supplier.payout_value || 0;
  }
  return 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Admin (frontend Run Now) or scheduled/service invocation (no user) allowed.
    let isScheduled = false;
    try { const u = await base44.auth.me(); if (!u || u.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 }); }
    catch (_) { isScheduled = true; }

    const suppliers = await base44.asServiceRole.entities.Supplier.list('', 500);
    const supBySid = {};
    suppliers.forEach(s => { supBySid[s.sid] = s; });

    let accrualsCreated = 0;
    let clawbacks = 0;

    // 1) Leads reaching a payable state, not yet accrued
    const leads = await base44.asServiceRole.entities.Lead.filter({ payout_accrued: false }, '-created_date', 500);
    for (const lead of leads) {
      if (!PAYABLE_STATES.includes(lead.lead_status)) continue;
      if (lead.is_test) continue;
      const supplier = supBySid[lead.supplier_sid];
      const supplierName = supplier?.name || lead.supplier_sid || 'Unknown';
      const amount = payoutForLead(lead, supplier);
      const dateStr = (lead.sold_at || lead.created_at || new Date().toISOString()).slice(0, 10);

      if (lead.lead_status === 'Returned' && supplier?.clawback_on_return) {
        await base44.asServiceRole.entities.ApEntry.create({
          supplier: supplierName, entry_type: 'adjustment', amount: -Math.abs(amount),
          date: dateStr, ref: lead.lead_key, note: 'Clawback on return',
        });
        clawbacks++;
      } else if (amount !== 0) {
        await base44.asServiceRole.entities.ApEntry.create({
          supplier: supplierName, entry_type: 'accrual', amount,
          date: dateStr, ref: lead.lead_key, note: 'Lead payout accrual',
        });
        accrualsCreated++;
      }
      await base44.asServiceRole.entities.Lead.update(lead.id, { payout_accrued: true, supplier_payout: amount });
    }

    // 2) MonetizationEvents not yet accrued (profit-share lists)
    const events = await base44.asServiceRole.entities.MonetizationEvent.filter({ accrued: false }, '-conversion_date', 500);
    for (const ev of events) {
      const pct = ev.payout_pct != null ? ev.payout_pct : (LIST_OVERRIDES[ev.list_name]?.value || 0);
      const amount = (ev.revenue || 0) * pct;
      if (amount !== 0) {
        await base44.asServiceRole.entities.ApEntry.create({
          supplier: ev.list_name || 'Profit Share', entry_type: 'accrual', amount,
          date: (ev.conversion_date || new Date().toISOString()).slice(0, 10),
          ref: ev.lead_key, note: `Monetization payout (${ev.channel})`,
        });
        accrualsCreated++;
      }
      await base44.asServiceRole.entities.MonetizationEvent.update(ev.id, { accrued: true, payout_amount: amount });
    }

    await base44.asServiceRole.entities.SyncRun.create({
      source: 'economics_payout_accrual', started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(), rows_in: leads.length + events.length,
      rows_upserted: accrualsCreated + clawbacks, errors: 0,
    });

    return Response.json({ ok: true, accrualsCreated, clawbacks, scheduled: isScheduled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});