import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Map } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/audit";

const EMPTY = { state_code: "", state_name: "", active: true, notes: "" };

export default function StatesTiers() {
  const { toast } = useToast();
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true);
    setStates(await base44.entities.StateConfig.list("state_code", 100));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(s) {
    await base44.entities.StateConfig.update(s.id, { active: !s.active });
    logAudit("update", "StateConfig", s.id, { active: !s.active });
    load();
  }

  async function save() {
    if (!form.state_code.trim()) { toast({ title: "State code required", variant: "destructive" }); return; }
    const created = await base44.entities.StateConfig.create({ ...form, state_code: form.state_code.toUpperCase() });
    logAudit("create", "StateConfig", created?.id, form);
    setOpen(false); setForm(EMPTY); load();
    toast({ title: "State added" });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="States & Tiers" subtitle="Enabled states and tiering notes"
        actions={<Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }} className="h-8 text-xs bg-brand-red hover:bg-brand-red/90"><Plus className="w-3.5 h-3.5 mr-1.5" />Add State</Button>} />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !states.length ? (
          <EmptyState icon={Map} title="No states configured" description="Add states to control eligibility." />
        ) : (
          <div className="divide-y divide-graphite-border">
            {states.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{s.state_code} <span className="text-graphite-muted font-normal">{s.state_name}</span></div>
                  {s.notes && <div className="text-xs text-graphite-muted">{s.notes}</div>}
                </div>
                <button onClick={() => toggle(s)} className={`text-[10px] px-2 py-0.5 rounded-full border ${s.active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "bg-graphite-well text-graphite-muted border-graphite-border"}`}>
                  {s.active ? "ACTIVE" : "DISABLED"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-graphite-elevated border-graphite-border max-w-md">
          <DialogHeader><DialogTitle>Add State</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Code (e.g. CA)" value={form.state_code} onChange={(e) => setForm({ ...form, state_code: e.target.value })} />
              <Input placeholder="Name" value={form.state_name} onChange={(e) => setForm({ ...form, state_name: e.target.value })} />
            </div>
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-brand-red hover:bg-brand-red/90" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}