import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// AI CFO / Ad-performance briefing. Operates on AGGREGATES ONLY — never lead PII.
// mode: "financial" (owner) or "ad" (media_buyer/ops).

function num(n) { return typeof n === 'number' && isFinite(n) ? n : 0; }
function usd(n) { return '$' + Math.round(num(n)).toLocaleString(); }
function dayStr(d) { return d.toISOString().slice(0, 10); }

async function callClaude(base44, system, prompt) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: system + '\n\n---\n\n' + prompt,
    model: 'claude_sonnet_4_6',
  });
  return typeof res === 'string' ? res : JSON.stringify(res);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'ad' ? 'ad' : 'financial';
    const includeTest = !!body.includeTest;
    const svc = base44.asServiceRole;

    if (mode === 'financial') {
      const snaps = await svc.entities.ReconSnapshot.list('-week_of', 4);
      const cur = snaps[0] || {};
      const prev = snaps[1] || {};
      const invoices = await svc.entities.ArInvoice.list('-issued_at', 500);
      const apEntries = await svc.entities.ApEntry.list('-date', 1000);

      // AR aging buckets
      const today = new Date();
      const aging = { current: 0, d30: 0, d60: 0, d90: 0 };
      for (const inv of invoices) {
        if (['paid'].includes(inv.status)) continue;
        const due = inv.due_at ? new Date(inv.due_at) : null;
        const daysPast = due ? Math.floor((today - due) / 86400000) : 0;
        const amt = num(inv.amount);
        if (daysPast <= 0) aging.current += amt;
        else if (daysPast <= 30) aging.d30 += amt;
        else if (daysPast <= 60) aging.d60 += amt;
        else aging.d90 += amt;
      }

      // Supplier arrears = accruals - payments per supplier
      const arrears = {};
      for (const e of apEntries) {
        const s = e.supplier || 'Unknown';
        arrears[s] = arrears[s] || 0;
        if (e.entry_type === 'payment') arrears[s] -= num(e.amount);
        else arrears[s] += num(e.amount);
      }
      const arrearsList = Object.entries(arrears).filter(([, v]) => Math.abs(v) > 1).sort((a, b) => b[1] - a[1]);

      const mondayDelta = num(cur.monday_number) - num(prev.monday_number);
      const mediaGapDelta = num(cur.media_gap) - num(prev.media_gap);
      const weeklyBurn = num(cur.ap_total) / 8 + num(cur.media_gap) / 4 || 1;
      const runwayWeeks = weeklyBurn > 0 ? Math.round(num(cur.cash) / weeklyBurn) : null;

      const facts = [
        `Week of: ${cur.week_of || dayStr(today)}`,
        `Monday Number: ${usd(cur.monday_number)} (WoW delta ${mondayDelta >= 0 ? '+' : ''}${usd(mondayDelta)})`,
        `Cash: ${usd(cur.cash)}`,
        `AR total: ${usd(cur.ar_total)} | aging — current ${usd(aging.current)}, 1-30 ${usd(aging.d30)}, 31-60 ${usd(aging.d60)}, 60+ ${usd(aging.d90)}`,
        `AP total: ${usd(cur.ap_total)}`,
        `Media gap: ${usd(cur.media_gap)} (WoW delta ${mediaGapDelta >= 0 ? '+' : ''}${usd(mediaGapDelta)})`,
        `Estimated runway: ${runwayWeeks == null ? 'n/a' : runwayWeeks + ' weeks'}`,
        `Supplier arrears (accrued minus paid): ${arrearsList.slice(0, 8).map(([s, v]) => `${s} ${usd(v)}`).join('; ') || 'none'}`,
      ].join('\n');

      const system = 'You are the fractional CFO for Legenex. Be blunt, numeric, plain-language. Flag anything that worsened. End with the single highest-impact action today. Never invent numbers.';
      const prompt = `Here are this week's AGGREGATE finances (no PII):\n${facts}\n\nWrite a short 7am briefing in markdown. Cover: cash by category, Monday Number delta WoW, AR aging changes, supplier arrears vs plan, media gap change, and runway in weeks. The three levers that move the Monday Number are: (1) the Inbounds repayment plan, (2) the LeadFlow statement of account, and (3) the fixed owner draw — frame your analysis and closing action around these three. If a number is missing, say so plainly; do not fabricate.`;

      const text = await callClaude(base44, system, prompt);
      return Response.json({ mode, briefing: text, facts });
    }

    // ===== AD PERFORMANCE MODE =====
    const start = dayStr(new Date(Date.now() - 30 * 86400000));
    const allSpend = await svc.entities.AdSpend.filter({ superseded: false });
    const spend = allSpend.filter((s) => (s.date || '') >= start);
    const allLeads = await svc.entities.Lead.list('-created_at', 8000);
    const leads = allLeads.filter((l) => (includeTest || !l.is_test) && (l.created_at || '').slice(0, 10) >= start);
    const calls = await svc.entities.Call.list('-ts', 3000);
    const knowledge = (await svc.entities.KnowledgeEntry.filter({ active: true })).slice(0, 30);

    // per-campaign aggregates
    const camp = {};
    for (const l of leads) {
      const c = l.utm_campaign || 'unattributed';
      const g = (camp[c] = camp[c] || { campaign: c, spend: 0, leads: 0, sold: 0, revenue: 0, calls: 0 });
      g.leads++;
      if (l.lead_status === 'Sold') g.sold++;
      g.revenue += num(l.lead_revenue);
    }
    for (const s of spend) {
      const c = s.campaign || 'unattributed';
      const g = (camp[c] = camp[c] || { campaign: c, spend: 0, leads: 0, sold: 0, revenue: 0, calls: 0 });
      g.spend += num(s.cost);
    }
    for (const c of calls) {
      const key = c.campaign || 'unattributed';
      if (camp[key]) camp[key].calls++;
    }
    const campaigns = Object.values(camp).map((g) => ({
      ...g,
      trueMargin: g.revenue - g.spend,
      cpl: g.sold ? g.spend / g.sold : null,
    })).filter((g) => g.spend > 0 || g.leads > 0).sort((a, b) => b.trueMargin - a.trueMargin);

    // DQ by supplier
    const dqBySupplier = {};
    for (const l of leads) {
      if (l.lead_status !== 'Disqualified') continue;
      const s = l.supplier_sid || 'unknown';
      dqBySupplier[s] = (dqBySupplier[s] || 0) + 1;
    }

    let intel = { winners: [] };
    try {
      const r = await base44.functions.invoke('creativeIntelData', { includeTest });
      intel = r?.data || r || { winners: [] };
    } catch (_e) { /* thin data ok */ }

    const kbBlock = knowledge.map((k) => `[[${k.title}]] ${(k.body || '').slice(0, 400)}`).join('\n');
    const facts = [
      `Top campaigns (spend / leads / sold / calls / true margin / CPL):`,
      ...campaigns.slice(0, 15).map((c) => `- ${c.campaign}: ${usd(c.spend)} / ${c.leads} / ${c.sold} / ${c.calls} / ${usd(c.trueMargin)} / ${c.cpl ? usd(c.cpl) : 'n/a'}`),
      `DQ by supplier: ${Object.entries(dqBySupplier).map(([s, n]) => `${s}:${n}`).join(', ') || 'none'}`,
      `Creative winners: ${(intel.winners || []).map((w) => `${w.angle} (margin ${usd(w.margin)})`).join('; ') || 'none yet'}`,
    ].join('\n');

    const system = 'You are the head of media buying for Legenex. Be blunt, numeric, plain-language. Ground EVERY recommendation in the Knowledge Base entries provided and cite which entries you used by their [[title]]. Never invent numbers.';
    const prompt = `AGGREGATE ad performance (last 30 days, no PII):\n${facts}\n\nKNOWLEDGE BASE (cite by title):\n${kbBlock || '(no active knowledge entries)'}\n\nWrite a markdown briefing: 1) what's working, 2) what to cut, 3) 2-4 specific scale or new-campaign suggestions. For each suggestion, give a heading starting with "SUGGESTION:" followed by the supplier SID, vertical, and one-line rationale citing the KB entry titles you relied on.`;

    const text = await callClaude(base44, system, prompt);
    return Response.json({ mode, briefing: text, facts, campaigns: campaigns.slice(0, 15), winners: intel.winners || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});