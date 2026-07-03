import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import ConnectorCard from "@/components/sources/ConnectorCard";
import { SOURCES } from "@/lib/sources";
import { getWebhookInfo } from "@/functions/getWebhookInfo";

export default function DataSources() {
  const [runs, setRuns] = useState({});
  const [webhooks, setWebhooks] = useState({});
  const [loading, setLoading] = useState(true);

  const loadRuns = useCallback(async () => {
    const all = await base44.entities.SyncRun.list('-started_at', 200);
    const latest = {};
    all.forEach(r => { if (!latest[r.source]) latest[r.source] = r; });
    setRuns(latest);
  }, []);

  useEffect(() => {
    Promise.all([
      loadRuns(),
      getWebhookInfo({}).then(res => {
        const map = {};
        (res.data.webhooks || []).forEach(w => { map[w.id] = w; });
        setWebhooks(map);
      }).catch(() => {})
    ]).finally(() => setLoading(false));
  }, [loadRuns]);

  return (
    <div>
      <PageHeader title="Data & Sources" subtitle="Connectors, webhooks, and sync status" />

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SOURCES.map(source => (
            <ConnectorCard
              key={source.id}
              source={source}
              run={runs[source.id]}
              webhook={webhooks[source.id]}
              onRun={loadRuns}
            />
          ))}
        </div>
      )}
    </div>
  );
}