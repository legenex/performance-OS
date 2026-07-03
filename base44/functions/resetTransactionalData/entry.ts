import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Owner-only hard reset of ALL transactional entities. Never touches config entities.
const TRANSACTIONAL = [
  "Lead", "BuyerFeedback", "MonetizationEvent", "Call", "AdSpend", "DailyRollup",
  "BankTransaction", "ArInvoice", "ArPayment", "ApEntry", "MediaLedgerRow",
  "OpexEntry", "OwnerLedgerEntry", "OtherIncomeEntry", "ReconSnapshot",
  "Alert", "WebhookEvent", "SyncRun", "ExternalParityRow"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = {};
    for (const entity of TRANSACTIONAL) {
      let total = 0;
      while (true) {
        const rows = await base44.asServiceRole.entities[entity].list('', 500);
        if (!rows.length) break;
        for (let i = 0; i < rows.length; i += 100) {
          await Promise.all(rows.slice(i, i + 100).map(r => base44.asServiceRole.entities[entity].delete(r.id)));
        }
        total += rows.length;
        if (rows.length < 500) break;
      }
      deleted[entity] = total;
    }

    return Response.json({ ok: true, deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});