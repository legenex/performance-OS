import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// LeadByte daily-summary parity import. Compares external (date, leads, sold, revenue)
// against DailyRollup. Variance > 1% creates a high-severity Alert showing both values.
// Payload: { rows: [{date, leads, sold, revenue}] }  (manual upload) — or none for stub.

function toNum(v) { const n = Number(String(v ?? '').replace(/[$,\s]/g, '')); return isFinite(n) ? n : 0; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : [];

    const run = await svc.entities.SyncRun.create({ source: 'leadbyte_parity', started_at: new Date().toISOString() });
    let upserted = 0, errors = 0, alerts = 0;

    const allRollups = await svc.entities.DailyRollup.list('-date', 5000);

    for (const r of rows) {
      try {
        const date = String(r.date || '').slice(0, 10);
        if (!date) continue;
        const extLeads = toNum(r.leads);
        const extRevenue = toNum(r.revenue);

        // internal totals for the date
        const dayRollups = allRollups.filter((x) => x.date === date);
        const intLeads = dayRollups.reduce((a, x) => a + (x.leads || 0), 0);
        const intRevenue = dayRollups.reduce((a, x) => a + (x.revenue || 0), 0);

        for (const [metric, ext, int] of [['leads', extLeads, intLeads], ['revenue', extRevenue, intRevenue]]) {
          const variance = int > 0 ? Math.abs(ext - int) / int : (ext > 0 ? 1 : 0);
          await svc.entities.ExternalParityRow.create({
            source: 'leadbyte', date, metric,
            external_value: ext, internal_value: int, variance_pct: variance,
          });
          upserted++;
          if (variance > 0.01) {
            await svc.entities.Alert.create({
              type: 'parity_variance', severity: 'critical',
              message: `LeadByte parity ${metric} off ${(variance * 100).toFixed(1)}% on ${date}: external ${ext} vs internal ${int}`,
              entity_ref: `parity:leadbyte:${date}:${metric}`,
            });
            alerts++;
          }
        }
      } catch (e) { errors++; }
    }

    await svc.entities.SyncRun.update(run.id, { finished_at: new Date().toISOString(), rows_in: rows.length, rows_upserted: upserted, errors });
    return Response.json({ ok: true, rows: rows.length, upserted, alerts, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});