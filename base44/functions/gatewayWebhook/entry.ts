import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Normalize a US phone to last-10-digits for identity matching
function normPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Resolve an existing lead: leadbyte_id > leadshook_id > normalized phone within 7-day window
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

Deno.serve(async (req) => {
  try {
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== Deno.env.get('GATEWAY_WEBHOOK_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const rawText = await req.text();

    // Log raw payload BEFORE parsing — never silently drop
    let payload;
    let webhookEvent;
    try {
      webhookEvent = await base44.asServiceRole.entities.WebhookEvent.create({
        source: 'gateway',
        received_at: new Date().toISOString(),
        raw_payload: rawText.slice(0, 90000),
        parse_status: 'received',
      });
    } catch (_) { /* logging must not block ingestion */ }

    try {
      payload = JSON.parse(rawText);
    } catch (e) {
      await base44.asServiceRole.entities.Alert.create({
        type: 'webhook_parse_error', severity: 'critical',
        message: `Gateway webhook parse failure: ${e.message}`,
        entity_ref: webhookEvent?.id || '', resolved: false,
      });
      if (webhookEvent) await base44.asServiceRole.entities.WebhookEvent.update(webhookEvent.id, { parse_status: 'parse_error' });
      return Response.json({ error: 'parse_error' }, { status: 200 });
    }

    const leadbyte_id = payload.leadbyte_id || payload.leadbyteId || null;
    const leadshook_id = payload.leadshook_id || null;
    const phone_normalized = normPhone(payload.phone);
    const created_at = payload.created_at || new Date().toISOString();

    const existing = await resolveLead(base44, { leadbyte_id, leadshook_id, phone_normalized, created_at });

    const leadFields = {
      ...payload,
      leadbyte_id, leadshook_id,
      phone: payload.phone || existing?.phone,
      phone_normalized: phone_normalized || existing?.phone_normalized,
      source_tag: 'gateway',
      created_at,
      lead_key: existing?.lead_key || leadbyte_id || leadshook_id || phone_normalized || `gw_${Date.now()}`,
    };
    if (payload.lead_status === 'Sold' && !leadFields.sold_at) leadFields.sold_at = created_at;

    let leadId;
    if (existing) {
      // collision: merge, never create a second row; bump dupe_count when a new key arrived
      const isDupe = (leadbyte_id && existing.leadbyte_id && existing.leadbyte_id !== leadbyte_id);
      await base44.asServiceRole.entities.Lead.update(existing.id, {
        ...leadFields,
        lead_key: existing.lead_key,
        dupe_count: (existing.dupe_count || 0) + (isDupe ? 1 : 0),
      });
      leadId = existing.id;
    } else {
      const created = await base44.asServiceRole.entities.Lead.create(leadFields);
      leadId = created.id;
    }

    if (webhookEvent) await base44.asServiceRole.entities.WebhookEvent.update(webhookEvent.id, { parse_status: 'parsed', lead_key: leadFields.lead_key });

    return Response.json({ ok: true, lead_id: leadId, merged: !!existing }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});