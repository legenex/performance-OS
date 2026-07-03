import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { creativeIntelData } from "@/functions/creativeIntelData";
import { sendToCreativeOS } from "@/functions/sendToCreativeOS";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ExportButton from "@/components/shared/ExportButton";
import Sparkline from "@/components/shared/Sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Trophy, Flame, Send } from "lucide-react";
import { formatMoney, formatNumber, formatPct } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";

export default function CreativeIntelligence() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ campaign_name_suggested: "", supplier_sid: "", brand: "", budget: "", cost_cap: "", audience_note: "", angles: "" });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    creativeIntelData({ includeTest })
      .then((res) => { if (alive) setData(res.data); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [includeTest]);

  function openSend(angle) {
    setForm({
      campaign_name_suggested: angle ? `NEW_${angle.angle}`.slice(0, 40) : "",
      supplier_sid: "", brand: "", budget: "", cost_cap: "",
      audience_note: "", angles: angle ? angle.angle : "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.campaign_name_suggested.trim()) { toast({ title: "Campaign name required", variant: "destructive" }); return; }
    setSending(true);
    try {
      const res = await sendToCreativeOS({
        ...form,
        budget: form.budget ? Number(form.budget) : null,
        cost_cap: form.cost_cap ? Number(form.cost_cap) : null,
      });
      if (res.data.posted) toast({ title: "Sent to CreativeOS", description: "Brief created and handoff posted." });
      else toast({ title: "Brief saved as draft", description: res.data.postError || "CreativeOS webhook not reachable.", variant: "destructive" });
      setOpen(false);
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Creative Intelligence"
        subtitle="Angle & hook leaderboard with fatigue detection"
        actions={
          <div className="flex gap-2">
            {data?.angles?.length ? <ExportButton filename="creative-angles" rows={data.angles} columns={[
              { key: 'angle', label: 'Angle' }, { key: 'cost', label: 'Spend' }, { key: 'leads', label: 'Leads' },
              { key: 'sold', label: 'Sold' }, { key: 'soldCpl', label: 'Sold CPL' }, { key: 'margin', label: 'Margin' },
            ]} /> : null}
            <Button size="sm" className="h-8 text-xs bg-brand-red hover:bg-brand-red/90" onClick={() => openSend(null)}>
              <Send className="w-3.5 h-3.5 mr-1.5" />Send to CreativeOS
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
      ) : !data?.angles?.length ? (
        <EmptyState icon={Sparkles} title="No creative data yet" description="Angle performance appears once spend and leads carry utm_content / utm_ad_label." />
      ) : (
        <>
          {/* Winners board */}
          {data.winners?.length > 0 && (
            <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-brand-amber" />
                <h2 className="text-sm font-semibold text-foreground">Winners Board</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {data.winners.map((w) => (
                  <div key={w.angle} className="bg-graphite-base border border-emerald-500/20 rounded-lg p-3">
                    <div className="text-xs font-medium text-foreground truncate">{w.angle}</div>
                    <div className="text-[11px] text-graphite-muted mt-1">Sold CPL ${w.soldCpl ? w.soldCpl.toFixed(2) : '—'}</div>
                    <div className="text-sm font-mono tabular-nums text-emerald-400 mt-1">${formatMoney(w.margin)} margin</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-graphite-border"><h2 className="text-sm font-semibold text-foreground">Angle / Hook Leaderboard</h2></div>
            <div className="divide-y divide-graphite-border">
              {data.angles.map((a) => (
                <div key={a.angle} className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{a.angle}</span>
                      {a.fatigue && <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-red border border-brand-red/40 bg-brand-red/10 px-1 rounded-full shrink-0"><Flame className="w-3 h-3" />fatigue</span>}
                    </div>
                  </div>
                  <div className="col-span-2 text-xs tabular-nums text-graphite-muted">
                    <div>${formatMoney(a.cost)} spend</div>
                    <div>{formatNumber(a.leads)} leads · {formatNumber(a.sold)} sold</div>
                  </div>
                  <div className="col-span-2 text-xs tabular-nums">
                    <div className="text-graphite-muted">Sold CPL <span className="text-foreground">${a.soldCpl ? a.soldCpl.toFixed(2) : '—'}</span></div>
                    <div className="text-graphite-muted">CTR <span className="text-foreground">{a.ctr != null ? formatPct(a.ctr * 100) : '—'}</span></div>
                  </div>
                  <div className="col-span-2 text-xs tabular-nums">
                    <span className={a.margin < 0 ? 'text-brand-coral' : 'text-emerald-400'}>${formatMoney(a.margin)}</span>
                    <div className="text-graphite-muted">margin</div>
                  </div>
                  <div className="col-span-2"><Sparkline data={a.trend} height={28} color={a.fatigue ? '#E4262C' : '#10B981'} /></div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => openSend(a)} className="text-graphite-muted hover:text-brand-red" title="Send to CreativeOS"><Send className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-graphite-panel border-graphite-border max-w-lg">
          <DialogHeader><DialogTitle>Send to CreativeOS</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Suggested campaign name (SID convention)" value={form.campaign_name_suggested} onChange={(e) => setForm({ ...form, campaign_name_suggested: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Supplier SID" value={form.supplier_sid} onChange={(e) => setForm({ ...form, supplier_sid: e.target.value })} />
              <Input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              <Input type="number" placeholder="Cost cap" value={form.cost_cap} onChange={(e) => setForm({ ...form, cost_cap: e.target.value })} />
            </div>
            <Textarea placeholder="Audience note" rows={2} value={form.audience_note} onChange={(e) => setForm({ ...form, audience_note: e.target.value })} />
            <Textarea placeholder="Angles (one per line)" rows={3} value={form.angles} onChange={(e) => setForm({ ...form, angles: e.target.value })} />
            <div className="text-[11px] text-graphite-muted bg-graphite-base border border-graphite-border rounded p-2">
              Compliance guardrails auto-attached: no fabricated testimonials · no dollar figures · no fake news chrome.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-brand-red hover:bg-brand-red/90" onClick={submit} disabled={sending}>{sending ? "Sending…" : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}