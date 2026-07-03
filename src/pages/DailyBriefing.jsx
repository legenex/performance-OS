import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { Sparkles, RefreshCw } from "lucide-react";

export default function DailyBriefing() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setBriefing("");
    try {
      const [snap, leads, invoices] = await Promise.all([
        base44.entities.ReconSnapshot.list("-week_of", 1),
        base44.entities.Lead.list("-created_at", 500),
        base44.entities.ArInvoice.list("-issued_at", 200),
      ]);
      const rows = leads.filter((l) => includeTest || !l.is_test);
      const s = snap[0] || {};
      const sold = rows.filter((l) => l.lead_status === "Sold").length;
      const revenue = rows.reduce((a, l) => a + (l.lead_revenue || 0), 0);
      const netProfit = rows.reduce((a, l) => a + (l.net_profit || 0), 0);
      const outstanding = invoices.filter((i) => ["sent", "partial", "overdue", "disputed"].includes(i.status)).reduce((a, i) => a + (i.amount || 0), 0);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the CFO of a legal-lead performance business. Write a concise daily briefing (markdown, 5-8 bullet points grouped under ## Cash, ## Performance, ## Risks & Actions).
Data:
- Monday Number: $${(s.monday_number || 0).toLocaleString()}
- Cash: $${(s.cash || 0).toLocaleString()}, AR: $${(s.ar_total || 0).toLocaleString()}, AP: $${(s.ap_total || 0).toLocaleString()}, Media gap: $${(s.media_gap || 0).toLocaleString()}
- Recent leads: ${rows.length}, sold: ${sold}
- Revenue (recent): $${revenue.toLocaleString()}, Net profit: $${netProfit.toLocaleString()}
- Outstanding AR: $${outstanding.toLocaleString()}
Be direct, flag risks, and give 2-3 specific actions.`,
      });
      setBriefing(res);
    } catch (e) {
      setBriefing("**Could not generate briefing.** " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily Briefing"
        subtitle="AI-generated CFO briefing from your live numbers"
        actions={<Button size="sm" onClick={generate} disabled={loading} className="h-8 text-xs bg-brand-red hover:bg-brand-red/90">
          {loading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
          {loading ? "Generating…" : "Generate Briefing"}
        </Button>}
      />

      <div className="bg-graphite-panel border border-graphite-border rounded-lg p-6 min-h-[300px]">
        {!briefing && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="w-10 h-10 text-graphite-faint mb-3" />
            <p className="text-sm text-graphite-muted">Generate a briefing to see today's CFO summary.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin mb-3" />
            <p className="text-sm text-graphite-muted">Reading your numbers…</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-foreground">
            <ReactMarkdown>{briefing}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}