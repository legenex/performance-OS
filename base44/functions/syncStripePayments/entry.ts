import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Stripe (restricted read key) — pulls charges/payouts as ArPayment candidates,
// surfaced in the Receivables payment-matching drawer. Requires STRIPE_RESTRICTED_KEY.

function toDate(sec) { return new Date(sec * 1000).toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const key = Deno.env.get('STRIPE_RESTRICTED_KEY');
    const run = await svc.entities.SyncRun.create({ source: 'stripe', started_at: new Date().toISOString() });

    if (!key) {
      await svc.entities.SyncRun.update(run.id, { finished_at: new Date().toISOString(), rows_in: 0, rows_upserted: 0, errors: 0 });
      return Response.json({ ok: true, pending: true, message: 'STRIPE_RESTRICTED_KEY not set — connector pending.' });
    }

    let upserted = 0, errors = 0;
    try {
      const res = await fetch('https://api.stripe.com/v1/charges?limit=100', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      for (const ch of (data.data || [])) {
        if (ch.status !== 'succeeded') continue;
        await svc.entities.ArPayment.create({
          buyer_name: ch.billing_details?.name || 'Unmatched (Stripe)',
          amount: (ch.amount || 0) / 100,
          date: toDate(ch.created),
          method: 'stripe',
          note: `Stripe charge ${ch.id} — candidate, unmatched`,
        }).catch(() => { errors++; });
        upserted++;
      }
    } catch (e) { errors++; }

    await svc.entities.SyncRun.update(run.id, { finished_at: new Date().toISOString(), rows_in: upserted, rows_upserted: upserted, errors });
    return Response.json({ ok: true, upserted, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});