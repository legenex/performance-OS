import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Boxes } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const MODELS = ["revshare_revenue", "revshare_net_profit", "flat_accepted", "flat_posted", "none"];
const EMPTY = { sid: "", name: "", email: "", status: "active", payout_model: "none", payout_value: "", clawback_on_return: false };

export default function Suppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true);
    setSuppliers(await base44.entities.Supplier.list("sid", 200));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(s) { setEditing(s); setForm({ ...EMPTY, ...s, payout_value: s.payout_value ?? "" }); setOpen(true); }

  async function save() {
    if (!form.sid.trim() || !form.name.trim()) { toast({ title: "SID and name required", variant: "destructive" }); return; }
    const payload = { ...form, payout_value: form.payout_value === "" ? null : Number(form.payout_value) };
    if (editing) await base44.entities.Supplier.update(editing.id, payload);
    else await base44.entities.Supplier.create(payload);
    setOpen(false); load();
    toast({ title: editing ? "Supplier updated" : "Supplier created" });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Suppliers" subtitle="Supplier configuration and payout models"
        actions={<Button size="sm" onClick={openNew} className="h-8 text-xs bg-brand-red hover:bg-brand-red/90"><Plus className="w-3.5 h-3.5 mr-1.5" />New Supplier</Button>} />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
        ) : !suppliers.length ? (
          <EmptyState icon={Boxes} title="No suppliers" description="Add your first supplier." />
        ) : (
          <div className="divide-y divide-graphite-border">
            {suppliers.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{s.sid} <span className="text-graphite-muted font-normal">— {s.name}</span></div>
                  <div className="text-xs text-graphite-muted">{s.payout_model}{s.payout_value != null ? ` · ${s.payout_value}` : ""}{s.clawback_on_return ? " · clawback" : ""}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${(s.status || "").toLowerCase() === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "bg-graphite-well text-graphite-muted border-graphite-border"}`}>{s.status || "—"}</span>
                  <button onClick={() => openEdit(s)} className="text-graphite-muted hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-graphite-elevated border-graphite-border max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "New Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="SID" value={form.sid} onChange={(e) => setForm({ ...form, sid: e.target.value })} />
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.payout_model} onValueChange={(v) => setForm({ ...form, payout_model: v })}>
                <SelectTrigger className="bg-graphite-well border-graphite-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-graphite-elevated border-graphite-border">
                  {MODELS.map((m) => <SelectItem key={m} value={m} className="text-foreground">{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Payout value" value={form.payout_value} onChange={(e) => setForm({ ...form, payout_value: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-graphite-muted">
                <input type="checkbox" checked={form.clawback_on_return} onChange={(e) => setForm({ ...form, clawback_on_return: e.target.checked })} />
                Clawback on return
              </label>
            </div>
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