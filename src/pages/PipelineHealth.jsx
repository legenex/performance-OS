import React from "react";
import ComingSoon from "@/components/shared/ComingSoon";

export default function PipelineHealth() {
  return (
    <ComingSoon
      title="Pipeline Health"
      subtitle="Funnel, sync board and validation gate"
      note="Today & 7-day funnel, full sync board with stale-red rows, dupe/test counters, DQ-reason breakdown and the Validation Gate tile land here next."
    />
  );
}