import React, { useState } from "react";
import { resetTransactionalData } from "@/functions/resetTransactionalData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, AlertTriangle } from "lucide-react";

// Owner-only. Two-step confirm: warning dialog → type RESET to arm the destructive call.
export default function DataReset() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function handleReset() {
    setRunning(true);
    try {
      const res = await resetTransactionalData({});
      setResult(res.data?.deleted || {});
      const total = Object.values(res.data?.deleted || {}).reduce((a, b) => a + b, 0);
      toast({ title: "Data reset complete", description: `${total} transactional rows deleted` });
      setOpen(false);
      setConfirmText("");
    } catch (err) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-graphite-panel border border-brand-red/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center">
          <Trash2 className="w-4 h-4 text-brand-red" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">Data Reset</div>
          <div className="text-xs text-graphite-muted">Delete ALL transactional data. Configuration is preserved.</div>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-3 border-brand-red/40 text-brand-red hover:bg-brand-red/10"
        onClick={() => { setResult(null); setOpen(true); }}
      >
        Reset transactional data…
      </Button>

      {result && (
        <div className="mt-3 text-xs text-graphite-muted">
          Deleted {Object.values(result).reduce((a, b) => a + b, 0)} rows across {Object.keys(result).length} entities.
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!running) setOpen(v); }}>
        <DialogContent className="bg-graphite-panel border-graphite-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-brand-red" /> Confirm Data Reset
            </DialogTitle>
            <DialogDescription className="text-graphite-muted">
              This permanently deletes every Lead, feedback, monetization, call, ad-spend, rollup,
              bank transaction, invoice, payment, payable, ledger, opex, income, snapshot, alert,
              webhook, sync run, and parity row. Configuration (suppliers, buyers, banks, budgets,
              rules, knowledge, accounts, users, settings) is <b>not</b> touched. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs text-graphite-muted uppercase tracking-wider mb-1.5 block">
              Type <span className="text-brand-red font-mono">RESET</span> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              className="bg-graphite-lighter border-graphite-border"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={running}>Cancel</Button>
            <Button
              className="bg-brand-red hover:bg-brand-red/90 text-white"
              disabled={confirmText !== "RESET" || running}
              onClick={handleReset}
            >
              {running ? "Deleting…" : "Delete all transactional data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}