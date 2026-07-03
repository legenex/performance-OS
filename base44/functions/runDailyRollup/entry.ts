import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Rebuild DailyRollup from leads. All analytical screens read rollups, never raw leads.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let isScheduled = false;
    try { const u = await base44.auth.me(); if (!u || u.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 }); }
    catch (_) { isScheduled = true; }

    const leads = await base44.asServiceRole.entities.Lead.list('-created_date', 2000);

    // Group by date + vertical + supplier_sid + buyer + state + source
    const groups = {};
    for (const l of leads) {
      if (l.is_test) continue;
      const date = (l.sold_at || l.created_at || '').slice(0, 10);
      if (!date) continue;
      const key = [date, l.lead_vertical || '', l.supplier_sid || '', l.buyer_name || '', l.accident_state || '', l.source_tag || ''].join('|');
      if (!groups[key]) {
        groups[key] = {
          date, vertical: l.lead_vertical || '', supplier_sid: l.supplier_sid || '',
          buyer_name: l.buyer_name || '', accident_state: l.accident_state || '', source: l.source_tag || '',
          leads: 0, sold: 0, returned: 0, dq: 0, revenue: 0, net_revenue: 0,
          payout_accrued: 0, media_cost: 0, cost_deduction: 0, profit: 0, net_profit: 0,
        };
      }
      const g = groups[key];
      g.leads += 1;
      if (l.lead_status === 'Sold') g.sold += 1;
      if (l.lead_status === 'Returned') g.returned += 1;
      if (l.lead_status === 'Disqualified') g.dq += 1;
      g.revenue += (l.lead_revenue || 0);
      g.net_revenue += (l.lead_net_revenue || 0);
      g.payout_accrued += (l.supplier_payout || 0);
      g.cost_deduction += (l.cost_deduction || 0);
      g.media_cost += (l.cost_deduction || 0);
      g.profit += (l.profit || 0);
      g.net_profit += (l.net_profit || 0);
    }

    // Wipe & rebuild changed dates: simplest reliable approach — clear all rollups then recreate
    const existing = await base44.asServiceRole.entities.DailyRollup.list('', 2000);
    if (existing.length) {
      const ids = existing.map(r => r.id);
      for (let i = 0; i < ids.length; i += 100) {
        await Promise.all(ids.slice(i, i + 100).map(id => base44.asServiceRole.entities.DailyRollup.delete(id)));
      }
    }

    const rows = Object.values(groups);
    for (let i = 0; i < rows.length; i += 50) {
      await base44.asServiceRole.entities.DailyRollup.bulkCreate(rows.slice(i, i + 50));
    }

    await base44.asServiceRole.entities.SyncRun.create({
      source: 'economics_daily_rollup', started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(), rows_in: leads.length,
      rows_upserted: rows.length, errors: 0,
    });

    return Response.json({ ok: true, rollupsBuilt: rows.length, scheduled: isScheduled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});