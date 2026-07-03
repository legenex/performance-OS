import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ExportButton from "@/components/shared/ExportButton";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Compass } from "lucide-react";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";

function groupBy(rows, key) {
  const m = {};
  for (const r of rows) { const k = r[key] || "—"; (m[k] = m[k] || []).push(r); }
  return m;
}
function sum(rows, f) { return rows.reduce((a, r) => a + (r[f] || 0), 0); }

export default function CampaignExplorer() {
  const { toast } = useToast();
  const [spend, setSpend] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chips, setChips] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [assignSid, setAssignSid] = useState({});

  async function load() {
    setLoading(true);
    const [rows, sups] = await Promise.all([
      base44.entities.AdSpend.filter({ superseded: false }, "-date", 2000),
      base44.entities.Supplier.list("", 200),
    ]);
    setSpend(rows);
    setSuppliers(sups);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const owned = useMemo(() => spend.filter((s) => (s.supplier_sid_parsed && !s.unattributed)), [spend]);
  const unattributed = useMemo(() => spend.filter((s) => s.unattributed || !s.supplier_sid_parsed), [spend]);

  const filtered = useMemo(() => {
    if (!chips.length) return owned;
    return owned.filter((s) => chips.every((c) => (s.supplier_sid_parsed === c || (s.structure_tokens || "").includes(c))));
  }, [owned, chips]);

  const sidTokens = useMemo(() => {
    const set = new Set();
    owned.forEach((s) => { if (s.supplier_sid_parsed) set.add(s.supplier_sid_parsed); });
    return Array.from(set).slice(0, 20);
  }, [owned]);

  const byCampaign = groupBy(filtered, "campaign");

  async function assign(row) {
    const sid = assignSid[row.id];
    if (!sid) { toast({ title: "Pick a supplier SID first", variant: "destructive" }); return; }
    await base44.entities.AdSpend.update(row.id, { supplier_sid_parsed: sid, unattributed: false });
    await base44.entities.AuditLog.create({ action: "spend_assign", entity_type: "AdSpend", entity_id: row.id, details: `→ ${sid}`, timestamp: new Date().toISOString() });
    toast({ title: `Assigned to ${sid}` });
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Campaign Explorer"
        subtitle="Campaign → ad set → ad drill-down for owned accounts"
        actions={<ExportButton filename="campaign-explorer" rows={filtered} columns={[
          { key: 'campaign', label: 'Campaign' }, { key: 'ad_set', label: 'Ad Set' }, { key: 'ad', label: 'Ad' },
          { key: 'supplier_sid_parsed', label: 'SID' }, { key: 'cost', label: 'Cost' }, { key: 'clicks', label: 'Clicks' },
        ]} />}
      />

      {/* SID filter chips */}
      {sidTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-graphite-muted">SID filters:</span>
          {sidTokens.map((t) => {
            const on = chips.includes(t);
            return (
              <button key={t} onClick={() => setChips(on ? chips.filter((c) => c !== t) : [...chips, t])}
                className={`text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${on ? 'bg-brand-red/15 text-brand-red border-brand-red/40' : 'bg-graphite-lighter text-graphite-muted border-graphite-border hover:text-foreground'}`}>
                {t}{on && <X className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Campaign tree */}
      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-graphite-border"><h2 className="text-sm font-semibold text-foreground">Owned Campaigns</h2></div>
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !Object.keys(byCampaign).length ? (
          <EmptyState icon={Compass} title="No owned campaigns" description="Attributed spend from owned accounts appears here." />
        ) : (
          <div className="divide-y divide-graphite-border">
            {Object.entries(byCampaign).map(([camp, rows]) => {
              const open = expanded[camp];
              const bySet = groupBy(rows, "ad_set");
              return (
                <div key={camp}>
                  <button onClick={() => setExpanded({ ...expanded, [camp]: !open })} className="w-full px-4 py-3 flex items-center justify-between hover:bg-graphite-lighter/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight className={`w-4 h-4 text-graphite-muted transition-transform ${open ? 'rotate-90' : ''}`} />
                      <span className="text-sm font-medium text-foreground truncate">{camp}</span>
                    </div>
                    <span className="text-xs tabular-nums text-graphite-muted shrink-0">${formatMoney(sum(rows, 'cost'))} · {formatNumber(sum(rows, 'clicks'))} clicks</span>
                  </button>
                  {open && (
                    <div className="bg-graphite-base/50">
                      {Object.entries(bySet).map(([set, setRows]) => (
                        <div key={set} className="pl-10 pr-4 py-2 border-t border-graphite-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-graphite-muted">{set}</span>
                            <span className="text-[11px] tabular-nums text-graphite-muted">${formatMoney(sum(setRows, 'cost'))}</span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {setRows.map((ad) => (
                              <div key={ad.id} className="flex items-center justify-between text-[11px] text-graphite-muted pl-3">
                                <span className="truncate">{ad.ad || 'ad'}</span>
                                <span className="tabular-nums">${formatMoney(ad.cost)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unattributed queue */}
      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-graphite-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Unattributed Queue</h2>
          <span className="text-xs text-graphite-muted">{unattributed.length} rows</span>
        </div>
        {!unattributed.length ? (
          <div className="px-4 py-6 text-xs text-graphite-muted text-center">Everything is attributed. 🎯</div>
        ) : (
          <div className="divide-y divide-graphite-border max-h-96 overflow-y-auto">
            {unattributed.slice(0, 100).map((row) => (
              <div key={row.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{row.campaign || 'Unknown campaign'}</div>
                  <div className="text-[11px] text-graphite-muted">{row.platform} · {row.date} · ${formatMoney(row.cost)}</div>
                </div>
                <select
                  value={assignSid[row.id] || ""}
                  onChange={(e) => setAssignSid({ ...assignSid, [row.id]: e.target.value })}
                  className="h-8 text-xs bg-graphite-base border border-graphite-border rounded px-2 text-foreground"
                >
                  <option value="">Assign SID…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.sid}>{s.sid} — {s.name}</option>)}
                </select>
                <Button size="sm" className="h-8 text-xs bg-brand-red hover:bg-brand-red/90" onClick={() => assign(row)}>Assign</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}