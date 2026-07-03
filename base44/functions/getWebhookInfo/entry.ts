import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns webhook endpoint URLs + whether each shared-secret is configured. Admin only.
// Secret VALUES are never returned — only whether they are set.
const WEBHOOKS = [
  { id: 'gateway', fn: 'gatewayWebhook', secretName: 'GATEWAY_WEBHOOK_SECRET' },
  { id: 'leadbyte', fn: 'leadbyteWebhook', secretName: 'LEADBYTE_WEBHOOK_SECRET' },
  { id: 'leadshook', fn: 'leadshookWebhook', secretName: 'LEADSHOOK_WEBHOOK_SECRET' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const origin = new URL(req.url).origin;

    const info = WEBHOOKS.map(w => ({
      id: w.id,
      url: `${origin}/api/apps/${appId}/functions/${w.fn}`,
      secretConfigured: !!Deno.env.get(w.secretName),
      secretName: w.secretName,
    }));

    return Response.json({ ok: true, webhooks: info });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});