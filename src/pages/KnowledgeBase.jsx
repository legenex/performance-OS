import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const EMPTY = { title: "", body: "", tags: "", author: "", active: true };

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true);
    const rows = await base44.entities.KnowledgeEntry.list("-updated_at", 200);
    setEntries(rows);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(e) {
    setEditing(e);
    setForm({ title: e.title || "", body: e.body || "", tags: e.tags || "", author: e.author || "", active: e.active !== false });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (editing) await base44.entities.KnowledgeEntry.update(editing.id, payload);
    else await base44.entities.KnowledgeEntry.create(payload);
    await base44.entities.AuditLog.create({ action: editing ? "kb_update" : "kb_create", entity_type: "KnowledgeEntry", entity_id: editing?.id || "", details: form.title, timestamp: new Date().toISOString() });
    setOpen(false);
    load();
    toast({ title: editing ? "Playbook updated" : "Playbook created" });
  }

  async function remove(e) {
    await base44.entities.KnowledgeEntry.delete(e.id);
    await base44.entities.AuditLog.create({ action: "kb_delete", entity_type: "KnowledgeEntry", entity_id: e.id, details: e.title, timestamp: new Date().toISOString() });
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Knowledge Base"
        subtitle="Playbook cards that ground AI recommendations"
        actions={<Button size="sm" onClick={openNew} className="h-8 text-xs bg-brand-red hover:bg-brand-red/90"><Plus className="w-3.5 h-3.5 mr-1.5" />New Playbook</Button>}
      />

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" /></div>
      ) : !entries.length ? (
        <EmptyState icon={BookOpen} title="No playbooks yet" description="Create your first playbook card." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {entries.map((e) => (
            <div key={e.id} className={`bg-graphite-panel border rounded-lg p-4 ${e.active === false ? 'border-graphite-border opacity-60' : 'border-graphite-border'}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{e.title}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(e)} className="text-graphite-muted hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(e)} className="text-graphite-muted hover:text-brand-red"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-xs text-graphite-muted mt-2 whitespace-pre-wrap line-clamp-6">{e.body}</p>
              {e.tags && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {e.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-graphite-lighter text-graphite-muted border border-graphite-border">{t}</span>
                  ))}
                </div>
              )}
              {e.author && <div className="text-[10px] text-graphite-muted mt-2">— {e.author}</div>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-graphite-panel border-graphite-border max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Playbook" : "New Playbook"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Body / playbook content" rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <Input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <Input placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-graphite-muted">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active (available to AI)
            </label>
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