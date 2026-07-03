import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Settings as SettingsIcon } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default function Settings() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration" />
      <div className="bg-graphite-panel border border-graphite-border rounded-lg p-6">
        <EmptyState icon={SettingsIcon} title="Settings coming in P3" description="Role-based access controls, webhook configs, and sync settings" />
      </div>
    </div>
  );
}