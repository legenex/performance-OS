import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Generic Google-Sheet sync driven by SheetSyncConfig. One SyncRun per invocation.
// Dispatches by config.target. Importers are hardened against repeated header rows
// mid-sheet, blank separator rows, trailing unnamed columns, and text-typed dates.
// Aggregate/operational records only.
//
// Payload: { config_id?: string }  — if omitted, runs all configs.

function normPhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}
function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[$,%\s]/g, ''));
  return isFinite(n) ? n : null;
}
function toDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  // handle m/d/yyyy text
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const yr = m[3].length === 2 ? '20' + m[3] : m[3];
    const dd = new Date(`${yr}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
    if (!isNaN(dd.getTime())) return dd.toISOString();
  }
  return null;
}
function pct(header) {
  // "Payout 60%" -> 0.6
  const m = String(header || '').match(/(\d{1,3})\s*%/);
  return m ? Number(m[1]) / 100 : null;
}

// Convert a fetched CSV/2D array into clean objects. Skips blank rows and repeated
// header rows; drops trailing unnamed columns.
function rowsToObjects(matrix) {
  if (!matrix || !matrix.length) return { headers: [], rows: [] };
  const rawHeaders = matrix[0].map((h) => String(h || '').trim());
  const headers = rawHeaders.filter((h) => h.length > 0);
  const headerKey = rawHeaders.join('|').toLowerCase();
  const out = [];
  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const allBlank = r.every((c) => c == null || String(c).trim() === '');
    if (allBlank) continue; // blank separator row
    if (r.map((c) => String(c || '').trim()).join('|').toLowerCase() === headerKey) continue; // repeated header
    const obj = {};
    rawHeaders.forEach((h, idx) => { if (h) obj[h] = r[idx]; });
    out.push(obj);
  }
  return { headers, rows: out, rawHeaders };
}

async function fetchSheetMatrix(url, tab) {
  // Accept a published CSV url or a Google Sheets url; fetch as CSV.
  let csvUrl = url;
  const gid = tab && /^\d+$/.test(tab) ? tab : null;
  if (url && url.includes('docs.google.com/spreadsheets')) {
    const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
    }
  }
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`fetch failed ${res.status}`);
  const text = await res.text();
  // Minimal CSV parse (handles quoted fields).
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function findHeader(rawHeaders, candidates) {
  const lower = rawHeaders.map((h) => String(h || '').toLowerCase());
  for (const cand of candidates) {
    const idx = lower.indexOf(cand.toLowerCase());
    if (idx >= 0) return rawHeaders[idx];
  }
  // fuzzy contains
  for (const cand of candidates) {
    const idx = lower.findIndex((h) => h.includes(cand.toLowerCase()));
    if (idx >= 0) return rawHeaders[idx];
  }
  return null;
}

async function processConfig(svc, config) {
  const matrix = await fetchSheetMatrix(config.sheet_url, config.tab);
  const { rows, rawHeaders } = rowsToObjects(matrix);
  let upserted = 0;

  const get = (obj, names) => {
    const h = findHeader(rawHeaders, names);
    return h ? obj[h] : undefined;
  };

  if (config.target === 'monetization') {
    // (a) Inbounds profit-share tabs -> MonetizationEvent
    const payoutHeader = rawHeaders.find((h) => /payout/i.test(h));
    const payoutPct = pct(payoutHeader) ?? 0.6;
    for (const r of rows) {
      const phone = normPhone(get(r, ['number1', 'phone', 'number']));
      if (!phone) continue;
      const revenue = toNum(get(r, ['revenue'])) || 0;
      await svc.entities.MonetizationEvent.create({
        lead_key: `phone:${phone}`,
        matched_phone: phone,
        channel: 'profitshare_dq_unsold',
        conversion_date: (toDate(get(r, ['Billable date', 'TIMESTAMP'])) || '').slice(0, 10) || null,
        revenue,
        payout_pct: payoutPct,
        payout_amount: revenue * payoutPct,
        legenex_profit: revenue * (1 - payoutPct),
        source_sheet: config.name,
        list_name: get(r, ['List']) || '',
      });
      upserted++;
    }
  } else if (config.target === 'disposition') {
    // (b) Qualified Unsold / 24M / DQ -> BuyerFeedback always + MonetizationEvent when conversion+revenue
    for (const r of rows) {
      const lpId = get(r, ['LP_LEAD_ID', 'lp_lead_id']);
      const phone = normPhone(get(r, ['phone', 'contacts']));
      if (!lpId && !phone) continue;
      const leadKey = lpId ? `lp:${lpId}` : `phone:${phone}`;
      await svc.entities.BuyerFeedback.create({
        lead_key: leadKey,
        buyer: get(r, ['pub_name']) || '',
        dispo: get(r, ['last disposition']) || '',
        source_sheet: config.name,
        feedback_ts: toDate(get(r, ['TIMESTAMP'])) || null,
      });
      upserted++;
      const convDate = toDate(get(r, ['Conversion date']));
      const rev = toNum(get(r, ['Revenue']));
      if (convDate && rev) {
        const is24 = /24/.test(config.name);
        await svc.entities.MonetizationEvent.create({
          lead_key: leadKey,
          lp_lead_id: lpId || '',
          matched_phone: phone,
          channel: is24 ? 'profitshare_24m' : 'profitshare_dq_unsold',
          conversion_date: convDate.slice(0, 10),
          revenue: rev,
          legenex_profit: toNum(get(r, ['Legenex Profit'])) || null,
          source_sheet: config.name,
        });
      }
    }
  } else if (config.target === 'revshare_statement') {
    // (c) Legenex Revshare statement -> ApEntry supplier_statement
    for (const r of rows) {
      const amount = toNum(get(r, ['amount', 'total', 'revenue']));
      if (amount == null) continue;
      await svc.entities.ApEntry.create({
        supplier: get(r, ['supplier', 'brand']) || 'LEGENEX',
        entry_type: 'supplier_statement',
        amount,
        date: (toDate(get(r, ['date'])) || new Date().toISOString()).slice(0, 10),
        ref: config.name,
        note: 'Revshare statement import',
      });
      upserted++;
    }
  } else if (config.target === 'calls') {
    // (d) IB Legenex Calls / converted-calls -> Call
    for (const r of rows) {
      const id = get(r, ['call_id', 'id']) || `${config.name}-${upserted}-${Date.now()}`;
      await svc.entities.Call.create({
        call_id: String(id),
        ts: toDate(get(r, ['ts', 'TIMESTAMP', 'date'])) || null,
        retainer_price: toNum(get(r, ['retainer_price', 'retainer', 'revenue'])) || null,
        state: get(r, ['state']) || '',
        converted: /convert/i.test(config.name) || String(get(r, ['converted']) || '').toLowerCase() === 'true',
        source: 'callcenter',
        buyer: get(r, ['pub_name', 'buyer']) || '',
      });
      upserted++;
    }
  } else if (config.target === 'feedback') {
    // (e) buyer feedback/dispo -> BuyerFeedback + latest-wins Lead update
    for (const r of rows) {
      const lpId = get(r, ['LP_LEAD_ID', 'lp_lead_id']);
      const phone = normPhone(get(r, ['phone']));
      const leadKey = lpId ? `lp:${lpId}` : (phone ? `phone:${phone}` : null);
      if (!leadKey) continue;
      const returned = /return/i.test(String(get(r, ['dispo', 'last disposition']) || ''));
      const converted = /convert|sold|won/i.test(String(get(r, ['dispo', 'last disposition']) || ''));
      await svc.entities.BuyerFeedback.create({
        lead_key: leadKey, buyer: get(r, ['buyer', 'pub_name']) || '',
        dispo: get(r, ['dispo', 'last disposition']) || '', returned, converted,
        return_reason: get(r, ['return_reason']) || '', source_sheet: config.name,
        feedback_ts: toDate(get(r, ['TIMESTAMP', 'date'])) || null,
      });
      upserted++;
      // latest-wins Lead update
      if (lpId) {
        const existing = await svc.entities.Lead.filter({ lp_lead_id: String(lpId) });
        if (existing.length) {
          await svc.entities.Lead.update(existing[0].id, {
            buyer_returned: returned, buyer_conversion: converted,
            buyer_return_reason: get(r, ['return_reason']) || existing[0].buyer_return_reason,
          });
        }
      }
    }
  } else if (config.target === 'walker') {
    // (f) Walker call sheets -> Call source walker
    for (const r of rows) {
      const id = get(r, ['call_id', 'id']) || `walker-${upserted}-${Date.now()}`;
      await svc.entities.Call.create({
        call_id: String(id),
        ts: toDate(get(r, ['ts', 'date', 'TIMESTAMP'])) || null,
        retainer_price: toNum(get(r, ['retainer_price', 'payout', 'revenue'])) || null,
        state: get(r, ['state']) || '', source: 'walker',
        buyer: 'Walker Advertising',
      });
      upserted++;
    }
  } else if (config.target === 'partner_spend') {
    // (g) Two Minute Reports partner spend -> AdSpend source sheet
    for (const r of rows) {
      const date = (toDate(get(r, ['date', 'Day'])) || '').slice(0, 10);
      if (!date) continue;
      await svc.entities.AdSpend.create({
        date, platform: get(r, ['platform', 'Publisher platform']) || 'partner',
        account_name: get(r, ['account_name', 'Account name']) || config.name,
        campaign: get(r, ['campaign', 'Campaign name']) || '',
        ad_set: get(r, ['ad_set', 'Ad set name']) || '',
        ad: get(r, ['ad', 'Ad name']) || '',
        cost: toNum(get(r, ['cost', 'Amount spent', 'spend'])) || 0,
        impressions: toNum(get(r, ['impressions', 'Impressions'])) || 0,
        clicks: toNum(get(r, ['clicks', 'Clicks'])) || 0,
        source: 'sheet',
      });
      upserted++;
    }
  }

  return { rowsIn: rows.length, upserted };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    let configs = await svc.entities.SheetSyncConfig.list('name', 200);
    if (body.config_id) configs = configs.filter((c) => c.id === body.config_id);
    if (body.target) configs = configs.filter((c) => c.target === body.target);

    const run = await svc.entities.SyncRun.create({ source: body.source || 'sheets', started_at: new Date().toISOString() });
    let rowsIn = 0, upserted = 0, errors = 0;
    const details = [];
    for (const cfg of configs) {
      try {
        const r = await processConfig(svc, cfg);
        rowsIn += r.rowsIn; upserted += r.upserted;
        details.push({ config: cfg.name, ...r });
      } catch (e) {
        errors++;
        details.push({ config: cfg.name, error: e.message });
      }
    }
    await svc.entities.SyncRun.update(run.id, {
      finished_at: new Date().toISOString(), rows_in: rowsIn, rows_upserted: upserted, errors,
    });

    return Response.json({ ok: true, configs: configs.length, rowsIn, upserted, errors, details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});