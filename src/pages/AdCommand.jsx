import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { adCommandData } from "@/functions/adCommandData";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import ExportButton from "@/components/shared/ExportButton";
import Sparkline from "@/components/shared/Sparkline";
import CplTrio from "@/components/ad/CplTrio";
import DivergenceChip from "@/components/ad/DivergenceChip";
import AnomalyStrip from "@/components/ad/AnomalyStrip";
import GuardrailBanner from "@/components/ad/GuardrailBanner";
import EmptyState from "@/components/shared/EmptyState";
import { formatMoney, formatNumber, formatPct } from "@/lib/formatters";

export default function AdCommand() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adCommandData({ includeTest })
      .then((res) => { if (alive) setData(res.data); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [includeTest]);

  const t = data?.totalsToday;
  const y = data?.totalsYest;
  const spendDelta = t && y && y.cost ? ((t.cost - y.cost) / y.cost) * 100 : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ad Command"
        subtitle="Today's spend and true unit economics"
        actions={data?.suppliers?.length ? (
          <ExportButton
            filename="ad-command-suppliers"
            rows={data.suppliers}
            columns={[
              { key: 'sid', label: 'Supplier SID' },
              { key: 'cost', label: 'Spend' },
              { key: 'leads', label: 'Leads' },
              { key: 'sold', label: 'Sold' },
              { key: 'trueCpl', label: 'True CPL' },
              { key: 'billableCpl', label: 'Billable CPL' },
              { key: 'soldCpl', label: 'Sold CPL' },
              { key: 'revenuePerLead', label: 'Rev/Lead' },
              { key: 'roas', label: 'ROAS' },
              { key: 'margin', label: 'Margin' },
            ]}
          />
        ) : null}
      />

      {data?.guardrail && <GuardrailBanner guardrail={data.guardrail} />}

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Spend Today" value={t?.cost} delta={spendDelta} deltaLabel={spendDelta != null ? `${Math.abs(spendDelta).toFixed(0)}% vs yest` : undefined} />
        <MetricCard label="Revenue Today" value={t?.revenue} />
        <MetricCard label="Margin Today" value={t?.margin} />
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
          <div className="text-xs font-medium text-graphite-muted uppercase tracking-wider mb-2">Leads / Sold</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-foreground">
            {formatNumber(t?.leads)} <span className="text-graphite-muted text-lg">/ {formatNumber(t?.sold)}</span>
          </div>
          <div className="text-xs text-graphite-muted mt-1">ROAS {t?.roas ? t.roas.toFixed(2) + 'x' : '—'}</div>
        </div>
      </div>

      {/* Anomaly strip */}
      <AnomalyStrip anomalies={data?.anomalies} />

      {/* Supplier breakdown */}
      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-graphite-border">
          <h2 className="text-sm font-semibold text-foreground">By Supplier — Today</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" />
          </div>
        ) : !data?.suppliers?.length ? (
          <EmptyState title="No spend today" description="Ad spend will appear here once synced." />
        ) : (
          <div className="divide-y divide-graphite-border">
            {data.suppliers.map((s) => (
              <div key={s.sid} className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{s.sid}</div>
                  <div className="text-xs text-graphite-muted tabular-nums">
                    ${formatMoney(s.cost)} · {formatNumber(s.leads)} leads · {formatNumber(s.sold)} sold
                  </div>
                </div>
                <div className="col-span-4">
                  <CplTrio trueCpl={s.trueCpl} billableCpl={s.billableCpl} soldCpl={s.soldCpl} />
                </div>
                <div className="col-span-2 text-xs tabular-nums text-graphite-muted">
                  <div>Rev/Lead <span className="text-foreground">${s.revenuePerLead ? s.revenuePerLead.toFixed(2) : '—'}</span></div>
                  <div>ROAS <span className="text-foreground">{s.roas ? s.roas.toFixed(2) + 'x' : '—'}</span></div>
                  <div>Margin <span className={s.margin < 0 ? 'text-brand-coral' : 'text-emerald-400'}>${formatMoney(s.margin)}</span></div>
                </div>
                <div className="col-span-2"><DivergenceChip divergencePct={s.divergencePct} /></div>
                <div className="col-span-1"><Sparkline data={s.spark} height={28} /></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign breakdown */}
      {data?.campaigns?.length > 0 && (
        <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-graphite-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">By Campaign — Today</h2>
            <ExportButton filename="ad-command-campaigns" rows={data.campaigns} columns={[
              { key: 'name', label: 'Campaign' }, { key: 'platform', label: 'Platform' },
              { key: 'cost', label: 'Spend' }, { key: 'leads', label: 'Leads' }, { key: 'sold', label: 'Sold' },
              { key: 'trueCpl', label: 'True CPL' }, { key: 'soldCpl', label: 'Sold CPL' }, { key: 'roas', label: 'ROAS' },
            ]} />
          </div>
          <div className="divide-y divide-graphite-border">
            {data.campaigns.map((c) => (
              <div key={c.name} className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                  <div className="text-xs text-graphite-muted">{c.platform || '—'} · {c.sid || 'unattributed'}</div>
                </div>
                <div className="col-span-4"><CplTrio trueCpl={c.trueCpl} billableCpl={c.billableCpl} soldCpl={c.soldCpl} /></div>
                <div className="col-span-2 text-xs tabular-nums text-graphite-muted">
                  <div>ROAS <span className="text-foreground">{c.roas ? c.roas.toFixed(2) + 'x' : '—'}</span></div>
                  <div>Margin <span className={c.margin < 0 ? 'text-brand-coral' : 'text-emerald-400'}>${formatMoney(c.margin)}</span></div>
                </div>
                <div className="col-span-3"><DivergenceChip divergencePct={c.divergencePct} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}