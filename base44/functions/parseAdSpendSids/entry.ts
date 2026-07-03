import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// SID parser: split campaign name on " | ", first token matched against Supplier SIDs.
// Matched -> supplier_sid_parsed + vertical_parsed + structure_tokens. Unmatched -> unattributed queue.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let isScheduled = false;
    try { const u = await base44.auth.me(); if (!u || u.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 }); }
    catch (_) { isScheduled = true; }

    const suppliers = await base44.asServiceRole.entities.Supplier.list('', 500);
    const sidSet = new Set(suppliers.map(s => (s.sid || '').toUpperCase()));

    // Only parse rows not yet parsed
    const rows = await base44.asServiceRole.entities.AdSpend.list('-date', 1000);
    let parsed = 0, unattributed = 0;

    for (const row of rows) {
      if (row.supplier_sid_parsed || row.unattributed) continue;
      const campaign = row.campaign || '';
      const tokens = campaign.split('|').map(t => t.trim()).filter(Boolean);
      const first = (tokens[0] || '').toUpperCase();

      if (first && sidSet.has(first)) {
        await base44.asServiceRole.entities.AdSpend.update(row.id, {
          supplier_sid_parsed: first,
          vertical_parsed: tokens[1] || '',
          structure_tokens: tokens.slice(2).join(' | '),
          unattributed: false,
        });
        parsed++;
      } else {
        await base44.asServiceRole.entities.AdSpend.update(row.id, { unattributed: true });
        unattributed++;
      }
    }

    await base44.asServiceRole.entities.SyncRun.create({
      source: 'sid_parser', started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(), rows_in: rows.length,
      rows_upserted: parsed, errors: unattributed,
    });

    return Response.json({ ok: true, parsed, unattributed, scheduled: isScheduled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});