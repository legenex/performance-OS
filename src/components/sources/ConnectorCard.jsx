import React from "react";
import { formatNumber } from "@/lib/formatters";
import SyncNowButton from "@/components/sources/SyncNowButton";
import SecretField from "@/components/sources/SecretField";
import { KIND_LABELS } from "@/lib/sources";
import { Webhook, Landmark, Cog, FileSpreadsheet, GitCompare, AlertTriangle } from "lucide-react";

const KIND_ICON = { webhook: Webhook, money: Landmark, api: Cog, sheet: FileSpreadsheet, parity: GitCompare };

function timeAgo(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ConnectorCard({ source, run, webhook, onRun }) {
  const Icon = KIND_ICON[source.kind] || Cog;
  const lastSync = run?.finished_at || run?.started_at;
  const isStale = lastSync ? (Date.now() - new Date(lastSync).getTime()) > 24 * 60 * 60 * 1000 : false;
  const hasError = (run?.errors || 0) > 0;

  return (
    <div className={`bg-graphite-panel border rounded-lg p-4 ${isStale ? 'border-red-500/40' : 'border-graphite-border'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-graphite-lighter flex items-center justify-center">
            <Icon className="w-4 h-4 text-graphite-muted" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">{source.name}</h4>
            <span className="text-[10px] text-graphite-muted uppercase tracking-wider">{KIND_LABELS[source.kind]}</span>
          </div>
        </div>
        {isStale && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">STALE</span>
        )}
      </div>

      <p className="text-xs text-graphite-muted mb-3 leading-relaxed">{source.desc}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="text-[10px] text-graphite-muted uppercase">Last Sync</div>
          <div className={`text-xs font-medium tabular-nums ${isStale ? 'text-red-400' : 'text-foreground'}`}>{timeAgo(lastSync) || '—'}</div>
        </div>
        <div>
          <div className="text-[10px] text-graphite-muted uppercase">Rows</div>
          <div className="text-xs font-medium tabular-nums text-foreground">{run ? formatNumber(run.rows_upserted || 0) : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] text-graphite-muted uppercase">Errors</div>
          <div className={`text-xs font-medium tabular-nums ${hasError ? 'text-amber-400' : 'text-foreground'}`}>{run ? formatNumber(run.errors || 0) : '—'}</div>
        </div>
      </div>

      {/* Webhook details */}
      {source.kind === 'webhook' && webhook && (
        <div className="space-y-1.5 mb-3 p-2 rounded-lg bg-graphite-base/50 border border-graphite-border">
          <SecretField label="URL" value={webhook.url} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-graphite-muted uppercase tracking-wider w-16 shrink-0">Secret</span>
            {webhook.secretConfigured ? (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">Configured — sent in X-Webhook-Secret header</span>
            ) : (
              <span className="text-[11px] text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Not set — add {webhook.secretName} in Settings</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {source.kind !== 'webhook' && (
        source.fn
          ? <SyncNowButton fn={source.fn} onDone={onRun} />
          : <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Pending — {source.name === 'Xero' ? 'use Import Center' : 'not configured'}</span>
      )}
    </div>
  );
}