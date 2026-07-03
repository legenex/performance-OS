import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mercury read-only sync: pull accounts + recent transactions, apply categorization rules, update balances.
function categorize(desc, counterparty, rules) {
  const hay = `${desc || ''} ${counterparty || ''}`.toLowerCase();
  for (const r of rules) {
    if (r.pattern && hay.includes(r.pattern.toLowerCase())) return { category: r.category, counterparty: r.counterparty || counterparty };
  }
  return { category: 'uncategorized', counterparty };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let isScheduled = false;
    try { const u = await base44.auth.me(); if (!u || u.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 }); }
    catch (_) { isScheduled = true; }

    const token = Deno.env.get('MERCURY_API_TOKEN');
    if (!token) return Response.json({ error: 'MERCURY_API_TOKEN not set' }, { status: 400 });

    const started = new Date().toISOString();
    const rules = await base44.asServiceRole.entities.CategorizationRule.list('-priority', 200);

    const acctRes = await fetch('https://api.mercury.com/api/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!acctRes.ok) {
      const body = await acctRes.text();
      await base44.asServiceRole.entities.Alert.create({ type: 'sync_error', severity: 'warning', message: `Mercury accounts fetch failed (${acctRes.status})`, resolved: false });
      return Response.json({ error: 'mercury_accounts_failed', status: acctRes.status, body: body.slice(0, 200) }, { status: 200 });
    }
    const acctData = await acctRes.json();
    const accounts = acctData.accounts || [];

    let rowsIn = 0, upserted = 0;
    for (const acc of accounts) {
      // Update / create BankAccount balance
      const existingAccts = await base44.asServiceRole.entities.BankAccount.filter({ name: acc.name });
      if (existingAccts.length) {
        await base44.asServiceRole.entities.BankAccount.update(existingAccts[0].id, { current_balance: acc.currentBalance ?? acc.availableBalance ?? 0, last_synced: started });
      } else {
        await base44.asServiceRole.entities.BankAccount.create({ name: acc.name, institution: 'Mercury', account_type: acc.kind || 'checking', current_balance: acc.currentBalance ?? 0, last_synced: started });
      }

      // Transactions
      const txRes = await fetch(`https://api.mercury.com/api/v1/account/${acc.id}/transactions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!txRes.ok) continue;
      const txData = await txRes.json();
      const txns = txData.transactions || [];
      for (const t of txns) {
        rowsIn++;
        const date = (t.postedAt || t.createdAt || started).slice(0, 10);
        const description = t.bankDescription || t.externalMemo || t.counterpartyName || 'Transaction';
        const counterparty = t.counterpartyName || '';
        const dedupe = await base44.asServiceRole.entities.BankTransaction.filter({ date, amount: t.amount, description });
        if (dedupe.length) continue;
        const cat = categorize(description, counterparty, rules);
        await base44.asServiceRole.entities.BankTransaction.create({
          date, account_ref: acc.name, description, amount: t.amount, counterparty: cat.counterparty,
          category: cat.category, source: 'mercury', match_status: 'unmatched',
        });
        upserted++;
      }
    }

    await base44.asServiceRole.entities.SyncRun.create({
      source: 'mercury', started_at: started, finished_at: new Date().toISOString(),
      rows_in: rowsIn, rows_upserted: upserted, errors: 0,
    });

    return Response.json({ ok: true, accounts: accounts.length, transactions: rowsIn, created: upserted, scheduled: isScheduled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});