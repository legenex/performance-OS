import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Angle/hook leaderboard from utm_content and utm_ad_label, joined to spend by
// campaign. Computes SOLD CPL, margin, 14-day trend and fatigue flags.
// Aggregates only — no lead PII.

function dayStr(d) { return d.toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const includeTest = !!body.includeTest;
    const start = dayStr(new Date(Date.now() - 14 * 86400000));

    const allSpend = await base44.asServiceRole.entities.AdSpend.filter({ superseded: false });
    const spend = allSpend.filter((s) => s.date >= start);
    const allLeads = await base44.asServiceRole.entities.Lead.list('-created_at', 8000);
    const leads = allLeads.filter((l) => {
      if (!includeTest && l.is_test) return false;
      return (l.created_at || '').slice(0, 10) >= start;
    });

    // Key leads by angle = utm_content || utm_ad_label.
    const angleMap = {};
    for (const l of leads) {
      const angle = l.utm_content || l.utm_ad_label || '(none)';
      const g = (angleMap[angle] = angleMap[angle] || { leads: [], spend: [] });
      g.leads.push(l);
    }
    // Attribute spend to angle via ad/utm on the spend row's `ad` field, else campaign match.
    for (const s of spend) {
      const angle = s.ad || '(none)';
      const g = (angleMap[angle] = angleMap[angle] || { leads: [], spend: [] });
      g.spend.push(s);
    }

    function windowMetrics(rows, days, field) {
      const cutoff = dayStr(new Date(Date.now() - days * 86400000));
      return rows.filter((r) => (r[field] || '').slice(0, 10) >= cutoff);
    }

    const angles = Object.entries(angleMap).map(([angle, g]) => {
      const cost = g.spend.reduce((a, s) => a + (s.cost || 0), 0);
      const clicks = g.spend.reduce((a, s) => a + (s.clicks || 0), 0);
      const impressions = g.spend.reduce((a, s) => a + (s.impressions || 0), 0);
      const total = g.leads.length;
      const sold = g.leads.filter((l) => l.lead_status === 'Sold').length;
      const revenue = g.leads.reduce((a, l) => a + (l.lead_revenue || 0), 0);
      const soldCpl = sold ? cost / sold : null;
      const margin = revenue - cost;
      const ctr = impressions ? clicks / impressions : null;
      const frequency = clicks ? impressions / clicks : null;

      // trend: last-7 vs prior-7 CPL, CTR, frequency
      const s7 = windowMetrics(g.spend, 7, 'date');
      const l7 = windowMetrics(g.leads, 7, 'created_at');
      const cost7 = s7.reduce((a, s) => a + (s.cost || 0), 0);
      const sold7 = l7.filter((l) => l.lead_status === 'Sold').length;
      const cpl7 = sold7 ? cost7 / sold7 : null;
      const ctr7 = s7.reduce((a, s) => a + (s.impressions || 0), 0) ? s7.reduce((a, s) => a + (s.clicks || 0), 0) / s7.reduce((a, s) => a + (s.impressions || 0), 0) : null;
      const freq7 = s7.reduce((a, s) => a + (s.clicks || 0), 0) ? s7.reduce((a, s) => a + (s.impressions || 0), 0) / s7.reduce((a, s) => a + (s.clicks || 0), 0) : null;

      // fatigue = CPL rising + frequency rising + CTR falling
      const cplRising = cpl7 != null && soldCpl != null && cpl7 > soldCpl;
      const freqRising = freq7 != null && frequency != null && freq7 > frequency;
      const ctrFalling = ctr7 != null && ctr != null && ctr7 < ctr;
      const fatigue = cplRising && freqRising && ctrFalling;

      // 14-day daily SOLD CPL sparkline
      const trend = [];
      for (let i = 13; i >= 0; i--) {
        const k = dayStr(new Date(Date.now() - i * 86400000));
        const dc = g.spend.filter((s) => (s.date || '').slice(0, 10) === k).reduce((a, s) => a + (s.cost || 0), 0);
        const ds = g.leads.filter((l) => (l.created_at || '').slice(0, 10) === k && l.lead_status === 'Sold').length;
        trend.push(ds ? dc / ds : 0);
      }

      return { angle, cost, leads: total, sold, revenue, soldCpl, margin, ctr, frequency, fatigue, trend };
    }).filter((a) => a.cost > 0 || a.leads > 0).sort((a, b) => b.margin - a.margin);

    const winners = angles.filter((a) => a.sold >= 1 && a.margin > 0 && !a.fatigue).slice(0, 8);

    return Response.json({ angles, winners });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});