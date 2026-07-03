import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncMercury } from "@/functions/syncMercury";
import { parseAdSpendSids } from "@/functions/parseAdSpendSids";
import { runPayoutAccrual } from "@/functions/runPayoutAccrual";
import { runCplAllocation } from "@/functions/runCplAllocation";
import { runDailyRollup } from "@/functions/runDailyRollup";
import { useToast } from "@/components/ui/use-toast";

const FN_MAP = {
  syncMercury,
  parseAdSpendSids,
  runPayoutAccrual,
  runCplAllocation,
  runDailyRollup,
};

export default function SyncNowButton({ fn, onDone }) {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);

  async function handleRun() {
    const runner = FN_MAP[fn];
    if (!runner) return;
    setRunning(true);
    try {
      const res = await runner({});
      toast({ title: `${fn} completed` });
      onDone?.(res.data);
    } catch (err) {
      toast({ title: "Sync failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button size="sm" onClick={handleRun} disabled={running}
      className="h-7 text-xs bg-graphite-lighter hover:bg-graphite-border text-foreground border border-graphite-border">
      <RefreshCw className={`w-3 h-3 mr-1.5 ${running ? 'animate-spin' : ''}`} />
      {running ? 'Syncing…' : 'Sync Now'}
    </Button>
  );
}