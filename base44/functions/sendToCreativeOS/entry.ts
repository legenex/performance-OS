import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Creates a CreativeBrief with compliance guardrails and posts handoff_payload
// to the CreativeOS webhook URL configured in Settings. Aggregates only.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      campaign_name_suggested, supplier_sid, brand, budget, cost_cap,
      audience_note, angles, source,
    } = body;

    if (!campaign_name_suggested) {
      return Response.json({ error: 'campaign_name_suggested is required' }, { status: 400 });
    }

    const compliance_notes = [
      'No fabricated testimonials.',
      'No specific dollar figures in creative.',
      'No fake news-site chrome or spoofed publisher branding.',
    ].join(' ');

    const handoffPayload = {
      campaign_name: campaign_name_suggested,
      supplier_sid: supplier_sid || null,
      brand: brand || null,
      budget: budget ?? null,
      cost_cap: cost_cap ?? null,
      audience_note: audience_note || null,
      angles: angles || null,
      compliance_guardrails: compliance_notes,
      requested_by: user.email,
      requested_at: new Date().toISOString(),
    };

    // Create the brief record first.
    const brief = await base44.asServiceRole.entities.CreativeBrief.create({
      created_at: new Date().toISOString(),
      source: source || 'creative_intelligence',
      campaign_name_suggested,
      supplier_sid: supplier_sid || '',
      brand: brand || '',
      budget: budget ?? null,
      cost_cap: cost_cap ?? null,
      audience_note: audience_note || '',
      angles: angles || '',
      compliance_notes,
      status: 'draft',
      handoff_payload: JSON.stringify(handoffPayload),
    });

    // Look up the configured CreativeOS webhook URL.
    let webhookUrl = null;
    try {
      const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: 'creativeos_webhook_url' });
      webhookUrl = rows[0]?.value || null;
    } catch (_) {}

    let posted = false;
    let postError = null;
    if (webhookUrl) {
      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(handoffPayload),
        });
        posted = resp.ok;
        if (!resp.ok) postError = `CreativeOS responded ${resp.status}`;
      } catch (e) {
        postError = e.message;
      }
    } else {
      postError = 'No CreativeOS webhook URL configured in Settings.';
    }

    if (posted) {
      await base44.asServiceRole.entities.CreativeBrief.update(brief.id, { status: 'sent_to_creativeos' });
    }

    return Response.json({ brief_id: brief.id, posted, postError });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});