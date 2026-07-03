import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import SyncNowButton from "@/components/sources/SyncNowButton";
import CreativeOsSetting from "@/components/settings/CreativeOsSetting";
import DataReset from "@/components/settings/DataReset";
import { useAuth } from "@/lib/AuthContext";
import { getRole } from "@/lib/roles";
import { Cog, Clock } from "lucide-react";

const ENGINE_JOBS = [
  { fn: "parseAdSpendSids", name: "SID Parser", desc: "Attribute AdSpend rows to suppliers by campaign SID", schedule: "Daily 02:00 UTC" },
  { fn: "runPayoutAccrual", name: "Payout Accrual", desc: "One accrual per payable lead & monetization event", schedule: "Daily 02:15 UTC" },
  { fn: "runCplAllocation", name: "CPL Allocation", desc: "Daily CPL & cost_deduction stamping", schedule: "Daily 02:30 UTC" },
  { fn: "runDailyRollup", name: "Daily Rollup", desc: "Rebuild analytical rollups from leads", schedule: "Daily 02:45 UTC" },
];

export default function Settings() {
  const { user } = useAuth();
  const isOwner = getRole(user) === "owner";
  return (
    <div>
      <PageHeader title="Settings" subtitle="Economics engine & system configuration" />

      <div className="max-w-2xl">
        <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider mb-3">Economics Engine</h3>
        <div className="space-y-2">
          {ENGINE_JOBS.map(job => (
            <div key={job.fn} className="bg-graphite-panel border border-graphite-border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-graphite-lighter flex items-center justify-center">
                  <Cog className="w-4 h-4 text-graphite-muted" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{job.name}</div>
                  <div className="text-xs text-graphite-muted">{job.desc}</div>
                  <div className="text-[10px] text-graphite-muted/70 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {job.schedule}
                  </div>
                </div>
              </div>
              <SyncNowButton fn={job.fn} />
            </div>
          ))}
        </div>

        <h3 className="text-xs font-semibold text-graphite-muted uppercase tracking-wider mb-3 mt-8">Integrations</h3>
        <CreativeOsSetting />

        {isOwner && (
          <>
            <h3 className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-3 mt-8">Danger Zone</h3>
            <DataReset />
          </>
        )}
      </div>
    </div>
  );
}