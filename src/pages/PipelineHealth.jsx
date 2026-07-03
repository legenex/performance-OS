import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import PipelineHealthPanel from "@/components/settings/PipelineHealthPanel";

export default function PipelineHealth() {
  return (
    <div>
      <PageHeader title="Pipeline Health" subtitle="Funnel, sync board and validation gate" />
      <PipelineHealthPanel />
    </div>
  );
}