import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function resolveLead(base44, { leadbyte_id, leadshook_id, phone_normalized, created_at }) {
  if (leadbyte_id) {
    const m = await base44.asServiceRole.entities.Lead.filter({ leadbyte_id });
    if (m.length) return m[0];
  }
  if (leadshook_id) {
    const m = await base44.asServiceRole.entities.Lead.filter({ leadshook_id });
    if (m.length) return m[0];
  }
  if (phone_normalized) {
    const m = await base44.asServiceRole.entities.Lead.filter({ phone_normalized });
    if (m.length) {
      const base = created_at ? new Date(created_at).getTime() : Date.now();
      const within = m.find(l => {
        const t = l.created_at ? new Date(l.created_at).getTime() : base;
        return Math.abs(base - t) <= 7 * 24 * 60 * 60 * 1000;
      });
      if (within) return within;
    }
  }
  return null;
}

const STATUS_MAP = { sold: 'Sold', unsold: 'Unsold', returned: 'Returned', rejected: 'Rejected' };

Deno.serve(async (req) => {
  try {
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== Deno.env.get('LEADBYTE_WEBHOOK_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const rawText = await req.text();

    let webhookEvent;
    try {
      webhookEvent = await base44.asServiceRole.entities.WebhookEvent.create({
        source: 'leadbyte', received_at: new Date().toISOString(),
        raw_payload: rawText.slice(0, 90000), parse_status: 'received',
      });
    } catch (_) {}

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (e) {
      await base44.asServiceRole.entities.Alert.create({
        type: 'webhook_parse_error', severity: 'critical',
        message: `LeadByte webhook parse failure: ${e.message}`,
        entity_ref: webhookEvent?.id || '', resolved: false,
      });
      if (webhookEvent) await base44.asServiceRole.entities.WebhookEvent.update(webhookEvent.id, { parse_status: 'parse_error' });
      return Response.json({ error: 'parse_error' }, { status: 200 });
    }

    const eventType = String(payload.event || payload.status || '').toLowerCase();
    const lead_status = STATUS_MAP[eventType] || payload.lead_status || 'Unsold';
    const leadbyte_id = payload.leadbyte_id || payload.lead_id || null;
    const leadshook_id = payload.leadshook_id || null;
    const phone_normalized = normPhone(payload.phone);
    const created_at = payload.created_at || new Date().toISOString();

    // ipl fee lookup: lead_net_revenue = revenue * buyer ipl_fee
    const revenue = Number(payload.revenue) || 0;
    let iplFee = 1;
    const buyerName = payload.buyer_name || payload.buyer;
    if (buyerName) {
      const buyers = await base44.asServiceRole.entities.Buyer.filter({ name: buyerName });
      if (buyers.length && buyers[0].ipl_fee != null) iplFee = buyers[0].ipl_fee;
    }

    const existing = await resolveLead(base44, { leadbyte_id, leadshook_id, phone_normalized, created_at });

    const fields = {
      leadbyte_id, leadshook_id,
      phone: payload.phone, phone_normalized,
      source_tag: 'leadbyte',
      lead_status,
      lead_revenue: revenue,
      lead_net_revenue: revenue * iplFee,
      buyer_name: buyerName,
      buyer_id: payload.buyer_id,
      created_at,
      lead_key: existing?.lead_key || leadbyte_id || leadshook_id || phone_normalized || `lb_${Date.now()}`,
    };
    if (lead_status === 'Sold') fields.sold_at = payload.sold_at || created_at;
    if (lead_status === 'Returned') {
      fields.buyer_returned = true;
      fields.buyer_return_reason = payload.return_reason || payload.returned_reason;
    }

    let leadId;
    if (existing) {
      const isDupe = (leadbyte_id && existing.leadbyte_id && existing.leadbyte_id !== leadbyte_id);
      await base44.asServiceRole.entities.Lead.update(existing.id, {
        ...fields, lead_key: existing.lead_key,
        dupe_count: (existing.dupe_count || 0) + (isDupe ? 1 : 0),
      });
      leadId = existing.id;
    } else {
      const created = await base44.asServiceRole.entities.Lead.create(fields);
      leadId = created.id;
    }

    if (webhookEvent) await base44.asServiceRole.entities.WebhookEvent.update(webhookEvent.id, { parse_status: 'parsed', lead_key: fields.lead_key });
    return Response.json({ ok: true, lead_id: leadId, merged: !!existing }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});