import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Weekly reconciliation (Monday 6am). Stores a ReconSnapshot and evaluates alert rules.
// Aggregates only.

function num(n) { return typeof n === 'number' && isFinite(n) ? n : 0; }
function weekOf(d) {
  const dt = new Date(d);
  const day = dt.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const now = new Date();
    const wk = weekOf(now);

    // ---- Snapshot inputs ----
    const banks = await svc.entities.BankAccount.list('name', 200);
    const cash = banks.reduce((a, b) => a + num(b.current_balance), 0);

    const invoices = await svc.entities.ArInvoice.list('-issued_at', 2000);
    const openInvoices = invoices.filter((i) => !['paid'].includes(i.status));
    const arTotal = openInvoices.reduce((a, i) => a + num(i.amount), 0);

    const apEntries = await svc.entities.ApEntry.list('-date', 5000);
    const arrears = {};
    for (const e of apEntries) {
      const s = e.supplier || 'Unknown';
      arrears[s] = arrears[s] || 0;
      if (e.entry_type === 'payment') arrears[s] -= num(e.amount);
      else arrears[s] += num(e.amount);
    }
    const apTotal = Object.values(arrears).reduce((a, v) => a + Math.max(0, v), 0);

    // media gap ~ spend not yet covered (recent unattributed spend proxy)
    const budgets = await svc.entities.WeeklyBudget.filter({ week_of: wk });
    const cap = budgets.reduce((a, b) => a + num(b.media_cap), 0);
    const start = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const spend = (await svc.entities.AdSpend.filter({ superseded: false })).filter((s) => (s.date || '') >= start);
    const spendTotal = spend.reduce((a, s) => a + num(s.cost), 0);
    const mediaGap = Math.max(0, spendTotal - cap);

    const mondayNumber = cash + arTotal - apTotal - mediaGap;

    const snapshot = await svc.entities.ReconSnapshot.create({
      week_of: wk, cash, ar_total: arTotal, ap_total: apTotal, media_gap: mediaGap, monday_number: mondayNumber,
    });

    // prior snapshots for WoW rules
    const snaps = await svc.entities.ReconSnapshot.list('-week_of', 5);
    const prev = snaps.find((s) => s.id !== snapshot.id && s.week_of < wk);
    const prev2 = snaps.filter((s) => s.week_of < wk).sort((a, b) => (a.week_of < b.week_of ? 1 : -1))[1];

    const created = [];
    async function alert(type, severity, message, entity_ref) {
      await svc.entities.Alert.create({ type, severity, message, entity_ref });
      created.push({ type, severity, message });
    }

    // (a) supplier arrears grew WoW
    if (prev && apTotal > num(prev.ap_total) + 1) {
      await alert('arrears_grew', 'warning', `Supplier arrears grew to $${Math.round(apTotal).toLocaleString()} (was $${Math.round(num(prev.ap_total)).toLocaleString()})`, `snapshot:${snapshot.id}`);
    }
    // (b) invoice past due
    for (const inv of openInvoices) {
      if (inv.due_at && new Date(inv.due_at) < now && !['paid'].includes(inv.status)) {
        await alert('invoice_overdue', 'warning', `Invoice for ${inv.buyer_name} past due: $${Math.round(num(inv.amount)).toLocaleString()}`, `invoice:${inv.id}`);
      }
    }
    // (c) media gap grew over $2k
    if (prev && mediaGap - num(prev.media_gap) > 2000) {
      await alert('media_gap_grew', 'warning', `Media gap grew $${Math.round(mediaGap - num(prev.media_gap)).toLocaleString()} to $${Math.round(mediaGap).toLocaleString()}`, `snapshot:${snapshot.id}`);
    }
    // (d) Monday Number fell two consecutive weeks
    if (prev && prev2 && mondayNumber < num(prev.monday_number) && num(prev.monday_number) < num(prev2.monday_number)) {
      await alert('monday_number_falling', 'critical', `Monday Number fell two weeks running — now $${Math.round(mondayNumber).toLocaleString()}`, `snapshot:${snapshot.id}`);
    }
    // (e) uncategorized bank rows > 0 for 48h
    const bankTx = await svc.entities.BankTransaction.list('-created_date', 3000).catch(() => []);
    const uncategorized = bankTx.filter((t) => !t.category && t.created_date && (now - new Date(t.created_date)) > 48 * 3600000);
    if (uncategorized.length) {
      await alert('uncategorized_bank', 'warning', `${uncategorized.length} bank rows uncategorized for 48h+`, 'bank:uncategorized');
    }
    // (f) SyncRun stale > 24h or failing
    const runs = await svc.entities.SyncRun.list('-started_at', 300);
    const latestBySource = {};
    for (const r of runs) if (!latestBySource[r.source]) latestBySource[r.source] = r;
    for (const [source, r] of Object.entries(latestBySource)) {
      const ts = new Date(r.finished_at || r.started_at).getTime();
      if (Date.now() - ts > 24 * 3600000) await alert('sync_stale', 'warning', `Sync "${source}" stale >24h`, `sync:${source}`);
      else if ((r.errors || 0) > 0) await alert('sync_failing', 'warning', `Sync "${source}" reported ${r.errors} errors`, `sync:${source}`);
    }
    // (g) webhook parse failures
    const badHooks = (await svc.entities.WebhookEvent.filter({ parse_status: 'error' }).catch(() => [])).length;
    if (badHooks > 0) await alert('webhook_parse_fail', 'warning', `${badHooks} webhook events failed to parse`, 'webhook:errors');

    // Lead-level rules (bounded scan)
    const leads = await svc.entities.Lead.list('-created_at', 8000);
    const monetizations = await svc.entities.MonetizationEvent.list('-conversion_date', 8000).catch(() => []);
    const monetizedKeys = new Set(monetizations.map((m) => m.lead_key));
    let soldZero = 0, revNoSold = 0;
    for (const l of leads) {
      const ageH = l.created_at ? (now - new Date(l.created_at)) / 3600000 : 0;
      // (h) Sold lead with zero revenue after 48h
      if (l.lead_status === 'Sold' && ageH > 48 && !num(l.lead_revenue)) soldZero++;
      // (i) revenue with neither Sold nor MonetizationEvent
      if (num(l.lead_revenue) > 0 && l.lead_status !== 'Sold' && !monetizedKeys.has(l.lead_key)) revNoSold++;
    }
    if (soldZero) await alert('sold_zero_revenue', 'warning', `${soldZero} Sold leads have $0 revenue after 48h`, 'leads:sold_zero');
    if (revNoSold) await alert('revenue_unexplained', 'warning', `${revNoSold} leads carry revenue with no Sold status or monetization`, 'leads:rev_unexplained');

    // (j) parity variance > 1% (recent)
    const parity = await svc.entities.ExternalParityRow.list('-date', 500).catch(() => []);
    const badParity = parity.filter((p) => num(p.variance_pct) > 0.01).length;
    if (badParity) await alert('parity_variance', 'critical', `${badParity} parity rows exceed 1% variance`, 'parity:variance');

    // (k) supplier accruals vs Revshare statement diverging > 2%
    const statements = apEntries.filter((e) => e.entry_type === 'supplier_statement');
    const stmtTotal = statements.reduce((a, e) => a + num(e.amount), 0);
    const accrualTotal = apEntries.filter((e) => e.entry_type === 'accrual').reduce((a, e) => a + num(e.amount), 0);
    if (stmtTotal > 0) {
      const div = Math.abs(accrualTotal - stmtTotal) / stmtTotal;
      if (div > 0.02) await alert('accrual_statement_divergence', 'warning', `Accruals vs Revshare statement diverge ${(div * 100).toFixed(1)}%`, 'ap:divergence');
    }

    return Response.json({ ok: true, snapshot, alerts: created.length, alertsCreated: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});