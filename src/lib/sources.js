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

  // Google Sheet syncs (SheetSyncConfig-driven; hardened parsing)
  { id: 'sheet_inbounds_profitshare', name: 'Inbounds Profit-Share', kind: 'sheet', fn: 'syncSheets', desc: 'Inbounds profit-share tabs → MonetizationEvent (channel profitshare_dq_unsold), payout % parsed from header' },
  { id: 'sheet_disposition', name: 'Qualified/24M/DQ Disposition', kind: 'sheet', fn: 'syncSheets', desc: 'Disposition tabs → BuyerFeedback + MonetizationEvent (24M / DQ), matched by LP_LEAD_ID then phone' },
  { id: 'sheet_revshare_statement', name: 'Legenex Revshare Statement', kind: 'sheet', fn: 'syncSheets', desc: 'Revshare statement → ApEntry (supplier_statement) for reconciliation' },
  { id: 'sheet_calls', name: 'IB Legenex Calls', kind: 'sheet', fn: 'syncSheets', desc: 'Calls & converted-calls tabs → Call rows with retainer_price & state' },
  { id: 'sheet_feedback', name: 'Buyer Feedback / Dispo', kind: 'sheet', fn: 'syncSheets', desc: 'Feedback sheets → BuyerFeedback with latest-wins Lead updates' },
  { id: 'sheet_walker', name: 'Walker Call Sheets', kind: 'sheet', fn: 'syncSheets', desc: 'Walker call sheets → Call rows (source walker)' },
  { id: 'sheet_partner_spend', name: 'Partner Spend (Two Minute Reports)', kind: 'sheet', fn: 'syncSheets', desc: 'Per-account partner-spend sheets → AdSpend (source sheet)' },

  // Parity & reconciliation
  { id: 'leadbyte_parity', name: 'LeadByte Parity', kind: 'parity', fn: 'importLeadByteParity', desc: 'Daily summary vs DailyRollup; variance >1% raises a high-severity Alert' },
  { id: 'weekly_recon', name: 'Weekly Reconciliation', kind: 'api', fn: 'runWeeklyRecon', desc: 'Monday 6am — stores ReconSnapshot and evaluates alert rules' },

  // Money & ad connectors
  { id: 'stripe', name: 'Stripe', kind: 'money', fn: 'syncStripePayments', desc: 'Restricted read key — charges/payouts become ArPayment candidates (payment matching)' },
  { id: 'xero', name: 'Xero', kind: 'money', fn: null, desc: 'CSV invoice import via Import Center now; OAuth pending' },
  { id: 'ringba', name: 'Ringba', kind: 'api', fn: 'syncRingba', desc: 'CSV import + scheduled pull stub → Call rows (source ringba)' },
  { id: 'ad_platforms', name: 'Meta & Google Ads', kind: 'api', fn: 'syncAdPlatforms', desc: 'Multi-account API pulls → AdSpend (source api); PARTNER accounts are sheet-only, flagged' },
];

export const KIND_LABELS = {
  webhook: 'Webhook',
  sheet: 'Google Sheet',
  api: 'Engine Job',
  money: 'Money Rail',
  parity: 'Parity',
};