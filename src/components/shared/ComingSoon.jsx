import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Construction } from "lucide-react";

export default function ComingSoon({ title, subtitle, note }) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Construction className="w-10 h-10 text-graphite-muted/40 mb-3" />
        <p className="text-sm font-medium text-graphite-muted">This screen is being built next</p>
        {note && <p className="text-xs text-graphite-muted/60 mt-1 max-w-md">{note}</p>}
      </div>
    </div>
  );
}