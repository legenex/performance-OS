import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GeneralPanel from "@/components/settings/GeneralPanel";
import DataSources from "@/pages/DataSources";
import ImportCenter from "@/pages/ImportCenter";
import PipelineHealthPanel from "@/components/settings/PipelineHealthPanel";
import PayoutRulesPanel from "@/components/settings/PayoutRulesPanel";
import BudgetsPanel from "@/components/settings/BudgetsPanel";
import BillingCyclesPanel from "@/components/settings/BillingCyclesPanel";
import CreativeOsSetting from "@/components/settings/CreativeOsSetting";
import UsersRoles from "@/pages/UsersRoles";

const TABS = [
  { value: "general", label: "General" },
  { value: "data-sources", label: "Data & Sources" },
  { value: "import", label: "Import Center" },
  { value: "pipeline", label: "Pipeline Health" },
  { value: "payout", label: "Payout Rules" },
  { value: "budgets", label: "Budgets & Thresholds" },
  { value: "billing", label: "Billing Cycles" },
  { value: "creativeos", label: "CreativeOS Webhook" },
  { value: "users", label: "Users & Roles" },
];

export default function Settings() {
  const [tab, setTab] = useState("general");

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration, data operations and access" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto bg-graphite-panel border border-graphite-border p-1 gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs data-[state=active]:bg-brand-red data-[state=active]:text-white text-graphite-muted">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="general" className="mt-0"><div className="max-w-2xl"><GeneralPanel /></div></TabsContent>
          <TabsContent value="data-sources" className="mt-0"><DataSources embedded /></TabsContent>
          <TabsContent value="import" className="mt-0"><ImportCenter embedded /></TabsContent>
          <TabsContent value="pipeline" className="mt-0"><PipelineHealthPanel /></TabsContent>
          <TabsContent value="payout" className="mt-0"><div className="max-w-3xl"><PayoutRulesPanel /></div></TabsContent>
          <TabsContent value="budgets" className="mt-0"><div className="max-w-3xl"><BudgetsPanel /></div></TabsContent>
          <TabsContent value="billing" className="mt-0"><div className="max-w-3xl"><BillingCyclesPanel /></div></TabsContent>
          <TabsContent value="creativeos" className="mt-0"><div className="max-w-2xl"><CreativeOsSetting /></div></TabsContent>
          <TabsContent value="users" className="mt-0"><UsersRoles /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}