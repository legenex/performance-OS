import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Ask AI over the current filtered aggregate view. Aggregates only — no lead PII.
// The frontend passes a compact `context` object (already aggregated).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = (body.question || '').slice(0, 1000);
    const screen = body.screen || 'the current screen';
    const context = body.context || {};
    if (!question) return Response.json({ error: 'question required' }, { status: 400 });

    const system = 'You are the embedded analyst inside Legenex PerformanceOS. Answer briefly and numerically using ONLY the aggregate context provided for the current screen. Never invent numbers; if the context lacks the answer, say what data is missing. No PII.';
    const prompt = `${system}\n\nScreen: ${screen}\nAggregate context (JSON):\n${JSON.stringify(context).slice(0, 6000)}\n\nQuestion: ${question}\n\nAnswer in 2-5 sentences of markdown.`;

    const r = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
    const answer = typeof r === 'string' ? r : JSON.stringify(r);
    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});