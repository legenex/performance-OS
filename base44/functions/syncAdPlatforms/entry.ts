import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Meta Insights + Google Ads daily pulls across multiple accounts / Business Managers.
// OWNED accounts pull via API (AdSpend source 'api'); PARTNER accounts (e.g. LEADFLOW)
// are spend-only from sheets and flagged honestly (skipped here). Every imported row is
// run through the existing SID parser (parseAdSpendSids) after the pull.
// Requires META_ACCESS_TOKEN and/or GOOGLE_ADS credentials per account.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const run = await svc.entities.SyncRun.create({ source: 'ad_platforms', started_at: new Date().toISOString() });

    // Accounts are configured in AdAccount. OWNED = api-pullable, PARTNER = sheet-only.
    const accounts = await svc.entities.AdAccount.list('name', 200).catch(() => []);
    const owned = accounts.filter((a) => (a.account_class || 'owned_api') === 'owned_api');
    const partner = accounts.filter((a) => a.account_class === 'partner_sheet');

    const metaToken = Deno.env.get('META_ACCESS_TOKEN');
    const googleToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    let upserted = 0, errors = 0;
    const notes = [];

    if (!metaToken && !googleToken) {
      notes.push('No META_ACCESS_TOKEN or GOOGLE_ADS credentials set — API pulls pending.');
    }
    if (partner.length) {
      notes.push(`${partner.length} PARTNER account(s) are spend-only from sheets (not API-pulled): ${partner.map((p) => p.name || p.account_id).join(', ')}`);
    }

    // Stub: real implementation would page the Meta Insights / Google Ads APIs per owned
    // account at campaign/ad-set/ad grain and upsert AdSpend rows with source 'api'.
    // For now we only run the SID parser so any api-sourced rows get attributed.
    try {
      const parse = await base44.functions.invoke('parseAdSpendSids', {});
      notes.push(`SID parser ran: ${JSON.stringify(parse?.data || parse).slice(0, 200)}`);
    } catch (e) { errors++; notes.push('SID parser error: ' + e.message); }

    await svc.entities.SyncRun.update(run.id, { finished_at: new Date().toISOString(), rows_in: upserted, rows_upserted: upserted, errors });
    return Response.json({ ok: true, ownedAccounts: owned.length, partnerAccounts: partner.length, upserted, errors, notes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});