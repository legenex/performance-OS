import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Creates a CreativeBrief from an AI ad-performance suggestion. Aggregates only.
// Auto-generates a SID-convention name: "SID | VERTICAL | STRUCTURE | ...".

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sid = (body.sid || 'LGNX').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const vertical = (body.vertical || 'MVA').toUpperCase();
    const structure = (body.structure || 'ABO-BROAD').toUpperCase();
    const rationale = body.rationale || '';

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const name = `${sid} | ${vertical} | ${structure} | ${stamp}`;

    const budget = Number(body.budget) || 2000;
    const costCap = Number(body.cost_cap) || 65;

    const system = 'You write concise Meta/Google campaign briefs for legal lead-gen. Output JSON only. No PII.';
    const prompt = `${system}\n\nDraft a campaign brief for SID ${sid}, vertical ${vertical}, structure ${structure}. Rationale: ${rationale}.\nReturn JSON with keys: audience_note (string, 1-2 sentences), angles (array of exactly 3 short ad angles), compliance_notes (string).`;

    let ai = { audience_note: '', angles: [], compliance_notes: '' };
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            audience_note: { type: 'string' },
            angles: { type: 'array', items: { type: 'string' } },
            compliance_notes: { type: 'string' },
          },
        },
      });
      ai = typeof r === 'string' ? JSON.parse(r) : r;
    } catch (_e) {
      ai = {
        audience_note: `Broad ${vertical} intent audience, US, 25-64, mobile-first.`,
        angles: ['Injured in an accident? You may be owed compensation.', 'No fee unless we win.', 'Free case review in 60 seconds.'],
        compliance_notes: 'No income/outcome guarantees. Clear attorney advertising disclaimer.',
      };
    }
    const angles = Array.isArray(ai.angles) ? ai.angles.slice(0, 3) : [];

    const handoff = {
      campaign_name: name,
      sid, vertical, structure,
      budget, cost_cap: costCap,
      audience_note: ai.audience_note,
      angles,
      compliance_notes: ai.compliance_notes,
      source: 'aiBriefing',
    };

    const brief = await base44.asServiceRole.entities.CreativeBrief.create({
      created_at: new Date().toISOString(),
      source: 'aiBriefing',
      campaign_name_suggested: name,
      supplier_sid: sid,
      brand: sid,
      budget,
      cost_cap: costCap,
      audience_note: ai.audience_note,
      angles: angles.join('\n'),
      compliance_notes: ai.compliance_notes,
      status: 'draft',
      handoff_payload: JSON.stringify(handoff),
    });

    return Response.json({ ok: true, brief });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});