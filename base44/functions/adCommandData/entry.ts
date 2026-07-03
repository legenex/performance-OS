import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Aggregates spend + lead outcomes into the CPL trio, ROAS, margin and platform
// divergence, grouped by BM/account/supplier and by campaign. Aggregates only —
// no lead PII is returned.

function dayStr(d) { return d.toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const includeTest = !!body.includeTest;

    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    const todayKey = dayStr(today);
    const yestKey = dayStr(yesterday);

    // Pull spend + leads for the last 2 days (plus a small sparkline window).
    const sparkStart = dayStr(new Date(Date.now() - 7 * 86400000));

    const allSpend = await base44.asServiceRole.entities.AdSpend.filter({ superseded: false });
    const spend = allSpend.filter((s) => s.date >= sparkStart);

    const allLeads = await base44.asServiceRole.entities.Lead.list('-created_at', 5000);
    const leads = allLeads.filter((l) => {
      if (!includeTest && l.is_test) return false;
      const c = (l.created_at || '').slice(0, 10);
      return c >= sparkStart;
    });

    // Helper: build a CPL block for a set of spend rows + lead rows.
    function cplBlock(spendRows, leadRows) {
      const cost = spendRows.reduce((a, s) => a + (s.cost || 0), 0);
      const impressions = spendRows.reduce((a, s) => a + (s.impressions || 0), 0);
      const clicks = spendRows.reduce((a, s) => a + (s.clicks || 0), 0);
      const total = leadRows.length;
      const sold = leadRows.filter((l) => l.lead_status === 'Sold').length;
      const returned = leadRows.filter((l) => l.lead_status === 'Returned').length;
      const billable = sold + returned;
      const revenue = leadRows.reduce((a, l) => a + (l.lead_revenue || 0), 0);
      const profit = leadRows.reduce((a, l) => a + (l.profit || 0), 0);
      return {
        cost, impressions, clicks,
        leads: total, sold, returned, billable,
        revenue,
        trueCpl: total ? cost / total : null,
        billableCpl: billable ? cost / billable : null,
        soldCpl: sold ? cost / sold : null,
        revenuePerLead: total ? revenue / total : null,
        margin: revenue - cost,             // calls-inclusive since revenue includes call payouts upstream
        roas: cost ? revenue / cost : null,
        profit,
      };
    }

    // Group by supplier SID.
    const supplierMap = {};
    for (const s of spend) {
      const sid = s.supplier_sid_parsed || 'UNATTRIBUTED';
      (supplierMap[sid] = supplierMap[sid] || { spend: [], leads: [] }).spend.push(s);
    }
    for (const l of leads) {
      const sid = l.supplier_sid || 'UNATTRIBUTED';
      (supplierMap[sid] = supplierMap[sid] || { spend: [], leads: [] }).leads.push(l);
    }

    const filterDay = (rows, key, field) => rows.filter((r) => (r[field] || '').slice(0, 10) === key);

    const suppliers = Object.entries(supplierMap).map(([sid, g]) => {
      const todaySpend = filterDay(g.spend, todayKey, 'date');
      const todayLeads = filterDay(g.leads, todayKey, 'created_at');
      const block = cplBlock(todaySpend, todayLeads);
      // platform cost-per-result divergence: AdSpend cost / clicks proxy vs sold CPL
      const platformCpr = block.clicks ? block.cost / block.clicks : null;
      let divergencePct = null;
      if (platformCpr != null && block.soldCpl) {
        divergencePct = ((block.soldCpl - platformCpr) / block.soldCpl) * 100;
      }
      // sparkline of daily true CPL over the window
      const spark = [];
      for (let i = 6; i >= 0; i--) {
        const k = dayStr(new Date(Date.now() - i * 86400000));
        const sp = filterDay(g.spend, k, 'date');
        const ld = filterDay(g.leads, k, 'created_at');
        const c = sp.reduce((a, s) => a + (s.cost || 0), 0);
        spark.push(ld.length ? c / ld.length : 0);
      }
      return { sid, ...block, platformCpr, divergencePct, spark };
    }).sort((a, b) => b.cost - a.cost);

    // Group by campaign (today).
    const campMap = {};
    for (const s of filterDay(spend, todayKey, 'date')) {
      const key = s.campaign || 'Unknown';
      (campMap[key] = campMap[key] || { spend: [], leads: [], platform: s.platform, sid: s.supplier_sid_parsed }).spend.push(s);
    }
    for (const l of filterDay(leads, todayKey, 'created_at')) {
      const key = l.utm_campaign || 'Unknown';
      (campMap[key] = campMap[key] || { spend: [], leads: [], platform: '', sid: l.supplier_sid }).leads.push(l);
    }
    const campaigns = Object.entries(campMap).map(([name, g]) => {
      const block = cplBlock(g.spend, g.leads);
      const platformCpr = block.clicks ? block.cost / block.clicks : null;
      let divergencePct = null;
      if (platformCpr != null && block.soldCpl) divergencePct = ((block.soldCpl - platformCpr) / block.soldCpl) * 100;
      return { name, platform: g.platform, sid: g.sid, ...block, platformCpr, divergencePct };
    }).sort((a, b) => b.cost - a.cost);

    // Totals today vs yesterday.
    const totalsToday = cplBlock(filterDay(spend, todayKey, 'date'), filterDay(leads, todayKey, 'created_at'));
    const totalsYest = cplBlock(filterDay(spend, yestKey, 'date'), filterDay(leads, yestKey, 'created_at'));

    // Anomalies.
    const anomalies = [];
    for (const s of suppliers) {
      const y = supplierMap[s.sid];
      const yBlock = cplBlock(filterDay(y.spend, yestKey, 'date'), filterDay(y.leads, yestKey, 'created_at'));
      if (s.trueCpl && yBlock.trueCpl && s.trueCpl > yBlock.trueCpl * 1.5) {
        anomalies.push({ type: 'CPL_SPIKE', severity: 'warning', supplier: s.sid, message: `${s.sid} true CPL up ${Math.round(((s.trueCpl - yBlock.trueCpl) / yBlock.trueCpl) * 100)}% vs yesterday` });
      }
      const sellToday = s.leads ? s.sold / s.leads : 0;
      const sellYest = yBlock.leads ? yBlock.sold / yBlock.leads : 0;
      if (sellYest > 0 && sellToday < sellYest * 0.7) {
        anomalies.push({ type: 'SELLTHROUGH_DROP', severity: 'warning', supplier: s.sid, message: `${s.sid} sell-through dropped to ${Math.round(sellToday * 100)}%` });
      }
      if (s.cost > 0 && s.leads === 0) {
        anomalies.push({ type: 'SPEND_ZERO_LEADS', severity: 'critical', supplier: s.sid, message: `${s.sid} spending $${s.cost.toFixed(0)} with zero leads` });
      }
      if (s.impressions > 0) {
        const freq = s.impressions / Math.max(1, s.clicks);
        if (freq > 20) anomalies.push({ type: 'FREQUENCY_CREEP', severity: 'info', supplier: s.sid, message: `${s.sid} frequency creep (impr/click ${freq.toFixed(0)})` });
      }
    }

    // Budget guardrail: bind to Monday Number red state.
    let recon = [];
    try { recon = await base44.asServiceRole.entities.ReconSnapshot.list('-week_of', 1); } catch (_) {}
    const latest = recon[0];
    const mondayNumber = latest?.monday_number ?? null;
    const redState = mondayNumber != null && mondayNumber < 0;
    let mediaCap = null;
    try {
      const wb = await base44.asServiceRole.entities.WeeklyBudget.list('-week_of', 1);
      mediaCap = wb[0]?.media_cap ?? null;
    } catch (_) {}

    return Response.json({
      todayKey, yestKey,
      totalsToday, totalsYest,
      suppliers, campaigns, anomalies,
      guardrail: { mondayNumber, redState, mediaCap, suppressScale: redState },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});