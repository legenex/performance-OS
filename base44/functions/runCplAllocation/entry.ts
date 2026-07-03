import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// CPL allocation: group non-superseded AdSpend by date+vertical+supplier_sid_parsed+source.
// billable = Sold + Returned; daily_cpl = spend/billable (zero-guarded); stamp cost_deduction on leads.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let isScheduled = false;
    try { const u = await base44.auth.me(); if (!u || u.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 }); }
    catch (_) { isScheduled = true; }

    const spend = await base44.asServiceRole.entities.AdSpend.filter({ superseded: false }, '-date', 1000);
    const leads = await base44.asServiceRole.entities.Lead.list('-created_date', 1000);

    // Group spend
    const groups = {};
    for (const s of spend) {
      if (s.unattributed || !s.supplier_sid_parsed) continue; // excluded until assigned
      const key = `${s.date}|${s.vertical_parsed || ''}|${s.supplier_sid_parsed}|${s.source}`;
      if (!groups[key]) groups[key] = { date: s.date, vertical: s.vertical_parsed || '', sid: s.supplier_sid_parsed, source: s.source, spend: 0 };
      groups[key].spend += (s.cost || 0);
    }

    // billable leads per group (Sold + Returned), matched by date+vertical+supplier_sid
    let stamped = 0;
    for (const key of Object.keys(groups)) {
      const g = groups[key];
      const groupLeads = leads.filter(l =>
        !l.is_test &&
        (l.sold_at || l.created_at || '').slice(0, 10) === g.date &&
        (l.lead_vertical || '') === g.vertical &&
        l.supplier_sid === g.sid &&
        (l.lead_status === 'Sold' || l.lead_status === 'Returned')
      );
      const billable = groupLeads.length;
      const daily_cpl = billable > 0 ? g.spend / billable : 0;

      for (const l of groupLeads) {
        const sid = l.supplier_sid || '';
        let cost_deduction;
        if (sid.startsWith('INBNDS')) cost_deduction = l.supplier_payout || 0;
        else if (sid === 'TFISH' && (l.lead_vertical || '') !== 'CAC-quiz') cost_deduction = 225;
        else cost_deduction = daily_cpl;

        const net_revenue = l.lead_net_revenue || 0;
        const profit = (l.lead_revenue || 0) - (l.supplier_payout || 0) - cost_deduction;
        const net_profit = net_revenue - (l.supplier_payout || 0) - cost_deduction;
        await base44.asServiceRole.entities.Lead.update(l.id, { cost_deduction, profit, net_profit });
        stamped++;
      }
    }

    await base44.asServiceRole.entities.SyncRun.create({
      source: 'economics_cpl_allocation', started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(), rows_in: spend.length,
      rows_upserted: stamped, errors: 0,
    });

    return Response.json({ ok: true, groups: Object.keys(groups).length, leadsStamped: stamped, scheduled: isScheduled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});