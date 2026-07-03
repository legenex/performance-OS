import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

Deno.serve(async (req) => {
  try {
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== Deno.env.get('LEADSHOOK_WEBHOOK_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const rawText = await req.text();

    let webhookEvent;
    try {
      webhookEvent = await base44.asServiceRole.entities.WebhookEvent.create({
        source: 'leadshook', received_at: new Date().toISOString(),
        raw_payload: rawText.slice(0, 90000), parse_status: 'received',
      });
    } catch (_) {}

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (e) {
      await base44.asServiceRole.entities.Alert.create({
        type: 'webhook_parse_error', severity: 'critical',
        message: `Leadshook webhook parse failure: ${e.message}`,
        entity_ref: webhookEvent?.id || '', resolved: false,
      });
      if (webhookEvent) await base44.asServiceRole.entities.WebhookEvent.update(webhookEvent.id, { parse_status: 'parse_error' });
      return Response.json({ error: 'parse_error' }, { status: 200 });
    }

    const leadshook_id = payload.leadshook_id || payload.id || null;
    const phone_normalized = normPhone(payload.phone);
    const created_at = payload.created_at || new Date().toISOString();

    // Upsert by leadshook_id — funnel-level DQ before LeadByte
    let existing = null;
    if (leadshook_id) {
      const m = await base44.asServiceRole.entities.Lead.filter({ leadshook_id });
      if (m.length) existing = m[0];
    }

    const fields = {
      leadshook_id,
      phone: payload.phone, phone_normalized,
      source_tag: 'leadshook',
      lead_status: 'Disqualified',
      supplier_brand: payload.brand || payload.funnel,
      utm_source: payload.utm_source,
      utm_campaign: payload.utm_campaign,
      utm_medium: payload.utm_medium,
      utm_content: payload.utm_content,
      injury_type: payload.dq_reason || payload.disqualify_reason,
      created_at,
      lead_key: existing?.lead_key || leadshook_id || phone_normalized || `lh_${Date.now()}`,
    };

    let leadId;
    if (existing) {
      await base44.asServiceRole.entities.Lead.update(existing.id, { ...fields, lead_key: existing.lead_key });
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