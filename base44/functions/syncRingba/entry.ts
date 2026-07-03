import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Ringba scheduled pull stub -> Call rows (source ringba). Requires RINGBA_API_KEY
// and RINGBA_ACCOUNT_ID. CSV import is handled via the Import Center.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const key = Deno.env.get('RINGBA_API_KEY');
    const acct = Deno.env.get('RINGBA_ACCOUNT_ID');
    const run = await svc.entities.SyncRun.create({ source: 'ringba', started_at: new Date().toISOString() });

    if (!key || !acct) {
      await svc.entities.SyncRun.update(run.id, { finished_at: new Date().toISOString(), rows_in: 0, rows_upserted: 0, errors: 0 });
      return Response.json({ ok: true, pending: true, message: 'RINGBA_API_KEY / RINGBA_ACCOUNT_ID not set — connector pending. Use Import Center for CSV.' });
    }

    // Stub: real implementation would POST the Ringba insights endpoint and map to Call rows.
    await svc.entities.SyncRun.update(run.id, { finished_at: new Date().toISOString(), rows_in: 0, rows_upserted: 0, errors: 0 });
    return Response.json({ ok: true, upserted: 0, message: 'Ringba pull stub — no rows this run.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});