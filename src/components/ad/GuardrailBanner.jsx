import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { formatMoneyShort } from "@/lib/formatters";

// Budget guardrail bound to the Monday Number state. Red state activates the
// weekly media cap and suppresses scale recommendations.
export default function GuardrailBanner({ guardrail }) {
  if (!guardrail) return null;
  const { redState, mediaCap, mondayNumber } = guardrail;
  if (redState) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-brand-red/40 bg-brand-red/10">
        <ShieldAlert className="w-5 h-5 text-brand-red shrink-0" />
        <div className="text-sm">
          <span className="font-semibold text-brand-red">Media cap active — Monday Number is red.</span>
          <span className="text-graphite-muted ml-2">
            Weekly media cap {mediaCap != null ? `$${formatMoneyShort(mediaCap)}` : 'enforced'}. Scale recommendations suppressed.
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
      <div className="text-sm text-emerald-300">
        Monday Number healthy{mondayNumber != null ? ` ($${formatMoneyShort(mondayNumber)})` : ''}. Scaling permitted within budget.
      </div>
    </div>
  );
}