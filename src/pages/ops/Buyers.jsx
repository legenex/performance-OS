import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/audit";

const EMPTY = { name: "", buyer_id: "", status: "active", ipl_fee: "", billing_terms: "", active_states: "", price_bands: "" };

export default function Buyers() {
  const { toast } = useToast();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true);
    setBuyers(await base44.entities.Buyer.list("name", 200));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(b) { setEditing(b); setForm({ ...EMPTY, ...b, ipl_fee: b.ipl_fee ?? "" }); setOpen(true); }

  async function save() {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = { ...form, ipl_fee: form.ipl_fee === "" ? null : Number(form.ipl_fee) };
    if (editing) {
      await base44.entities.Buyer.update(editing.id, payload);
      logAudit("update", "Buyer", editing.id, payload);
    } else {
      const created = await base44.entities.Buyer.create(payload);
      logAudit("create", "Buyer", created?.id, payload);
    }
    setOpen(false); load();
    toast({ title: editing ? "Buyer updated" : "Buyer created" });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Buyers" subtitle="Buyer configuration, terms and active states"
        actions={<Button size="sm" onClick={openNew} className="h-8 text-xs bg-brand-red hover:bg-brand-red/90"><Plus className="w-3.5 h-3.5 mr-1.5" />New Buyer</Button>} />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !buyers.length ? (
          <EmptyState icon={Users} title="No buyers" description="Add your first buyer." />
        ) : (
          <div className="divide-y divide-graphite-border">
            {buyers.map((b) => (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{b.name}</div>
                  <div className="text-xs text-graphite-muted">{b.billing_terms || "—"} · {b.active_states || "all states"}{b.ipl_fee != null ? ` · IPL $${b.ipl_fee}` : ""}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${(b.status || "").toLowerCase() === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "bg-graphite-well text-graphite-muted border-graphite-border"}`}>{b.status || "—"}</span>
                  <button onClick={() => openEdit(b)} className="text-graphite-muted hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-graphite-elevated border-graphite-border max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Buyer" : "New Buyer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Buyer ID" value={form.buyer_id} onChange={(e) => setForm({ ...form, buyer_id: e.target.value })} />
              <Input placeholder="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="IPL Fee" value={form.ipl_fee} onChange={(e) => setForm({ ...form, ipl_fee: e.target.value })} />
              <Input placeholder="Billing terms" value={form.billing_terms} onChange={(e) => setForm({ ...form, billing_terms: e.target.value })} />
            </div>
            <Input placeholder="Active states (comma separated)" value={form.active_states} onChange={(e) => setForm({ ...form, active_states: e.target.value })} />
            <Input placeholder="Price bands" value={form.price_bands} onChange={(e) => setForm({ ...form, price_bands: e.target.value })} />
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