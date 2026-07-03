import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({ icon: Icon = Database, title = "No data yet", description = "Import data to get started" }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-10 h-10 text-graphite-muted/40 mb-3" />
      <p className="text-sm font-medium text-graphite-muted">{title}</p>
      <p className="text-xs text-graphite-muted/60 mt-1">{description}</p>
    </div>
  );
}