import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const KEY = "creativeos_webhook_url";

export default function CreativeOsSetting() {
  const { toast } = useToast();
  const [row, setRow] = useState(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: KEY }).then((rows) => {
      if (rows[0]) { setRow(rows[0]); setValue(rows[0].value || ""); }
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (row) await base44.entities.AppSetting.update(row.id, { value });
      else { const created = await base44.entities.AppSetting.create({ key: KEY, value }); setRow(created); }
      toast({ title: "CreativeOS webhook saved" });
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-graphite-panel border border-graphite-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-graphite-lighter flex items-center justify-center"><Sparkles className="w-4 h-4 text-graphite-muted" /></div>
        <div>
          <div className="text-sm font-medium text-foreground">CreativeOS Webhook URL</div>
          <div className="text-xs text-graphite-muted">Where creative briefs are posted on handoff</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Input placeholder="https://creativeos.example.com/webhook" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button size="sm" className="bg-brand-red hover:bg-brand-red/90" onClick={save} disabled={saving}>{saving ? "…" : "Save"}</Button>
      </div>
    </div>
  );
}