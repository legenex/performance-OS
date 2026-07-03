// Source registry for the Data & Sources page.
// kind: webhook | sheet | api | money | parity
export const SOURCES = [
  { id: 'gateway', name: 'Gateway Feed', kind: 'webhook', fn: 'gatewayWebhook', secretName: 'GATEWAY_WEBHOOK_SECRET', desc: 'Primary lead source — all status triggers, revenue & return updates' },
  { id: 'leadbyte', name: 'LeadByte Webhook', kind: 'webhook', fn: 'leadbyteWebhook', secretName: 'LEADBYTE_WEBHOOK_SECRET', desc: 'Secondary/direct — sold/unsold/returned/rejected' },
  { id: 'leadshook', name: 'Leadshook Webhook', kind: 'webhook', fn: 'leadshookWebhook', secretName: 'LEADSHOOK_WEBHOOK_SECRET', desc: 'Funnel-level DQ before LeadByte' },
  { id: 'mercury', name: 'Mercury', kind: 'money', fn: 'syncMercury', desc: 'Read-only — daily accounts + transactions with rules categorization' },
  { id: 'sid_parser', name: 'SID Parser', kind: 'api', fn: 'parseAdSpendSids', desc: 'Attributes AdSpend rows to suppliers by campaign SID' },
  { id: 'economics_payout_accrual', name: 'Payout Accrual', kind: 'api', fn: 'runPayoutAccrual', desc: 'Economics — one accrual per payable lead & monetization event' },
  { id: 'economics_cpl_allocation', name: 'CPL Allocation', kind: 'api', fn: 'runCplAllocation', desc: 'Economics — daily CPL & cost_deduction stamping' },
  { id: 'economics_daily_rollup', name: 'Daily Rollup', kind: 'api', fn: 'runDailyRollup', desc: 'Rebuilds analytical rollups from leads' },
];

export const KIND_LABELS = {
  webhook: 'Webhook',
  sheet: 'Google Sheet',
  api: 'Engine Job',
  money: 'Money Rail',
  parity: 'Parity',
};