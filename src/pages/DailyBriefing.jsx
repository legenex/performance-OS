import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { aiBriefing } from "@/functions/aiBriefing";
import { draftCampaignBrief } from "@/functions/draftCampaignBrief";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { Sparkles, RefreshCw, FileText } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getRole } from "@/lib/roles";
import { useToast } from "@/components/ui/use-toast";

function parseSuggestions(text) {
  // Extract lines like "SUGGESTION: SID VERTICAL ... rationale"
  const out = [];
  const re = /SUGGESTION:\s*(.+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const line = m[1].trim();
    const tokens = line.split(/[\s|,–-]+/).filter(Boolean);
    out.push({
      sid: (tokens[0] || "LGNX").toUpperCase(),
      vertical: (tokens[1] || "MVA").toUpperCase(),
      rationale: line,
    });
  }
  return out.slice(0, 6);
}

function BriefingPane({ mode, includeTest }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(null);

  async function run() {
    setLoading(true);
    setText("");
    try {
      const res = await aiBriefing({ mode, includeTest });
      setText(res.data?.briefing || res.data?.error || "No briefing returned.");
    } catch (e) {
      setText("**Could not generate briefing.** " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [mode, includeTest]);

  const suggestions = mode === "ad" ? parseSuggestions(text) : [];

  async function draft(s) {
    setDrafting(s.rationale);
    try {
      await draftCampaignBrief({ sid: s.sid, vertical: s.vertical, rationale: s.rationale });
      toast({ title: "Campaign brief drafted", description: `${s.sid} · ${s.vertical}` });
    } catch (e) {
      toast({ title: "Draft failed", description: e.message, variant: "destructive" });
    } finally {
      setDrafting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={run} disabled={loading} className="h-8 text-xs bg-brand-red hover:bg-brand-red/90">
          {loading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          {loading ? "Generating…" : "Regenerate"}
        </Button>
      </div>

      <div className="bg-graphite-panel border border-graphite-border rounded-lg p-6 min-h-[280px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-6 h-6 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin mb-3" />
            <p className="text-sm text-graphite-muted">Reading your aggregate numbers…</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-foreground">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>

      {suggestions.length > 0 && !loading && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider">Campaign Suggestions</h3>
          {suggestions.map((s, i) => (
            <div key={i} className="bg-graphite-panel border border-graphite-border rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{s.sid} · {s.vertical}</div>
                <div className="text-xs text-graphite-muted truncate">{s.rationale}</div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => draft(s)} disabled={drafting === s.rationale}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />{drafting === s.rationale ? "Drafting…" : "Draft Campaign Brief"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DailyBriefing() {
  const ctx = useOutletContext?.() || {};
  const includeTest = ctx.includeTest || false;
  const { user } = useAuth();
  const role = getRole(user);
  const canFinancial = role === "owner";
  const [tab, setTab] = useState(canFinancial ? "financial" : "ad");

  return (
    <div className="space-y-5">
      <PageHeader title="Daily Briefing" subtitle="AI-generated briefing from your live aggregates" actions={<Sparkles className="w-5 h-5 text-brand-red" />} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-graphite-panel border border-graphite-border p-1">
          {canFinancial && (
            <TabsTrigger value="financial" className="text-xs data-[state=active]:bg-brand-red data-[state=active]:text-white text-graphite-muted">Financial</TabsTrigger>
          )}
          <TabsTrigger value="ad" className="text-xs data-[state=active]:bg-brand-red data-[state=active]:text-white text-graphite-muted">Ad Performance</TabsTrigger>
        </TabsList>

        <div className="mt-5">
          {canFinancial && (
            <TabsContent value="financial" className="mt-0"><BriefingPane mode="financial" includeTest={includeTest} /></TabsContent>
          )}
          <TabsContent value="ad" className="mt-0"><BriefingPane mode="ad" includeTest={includeTest} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}