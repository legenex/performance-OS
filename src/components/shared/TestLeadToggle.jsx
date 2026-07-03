import React from "react";
import { Switch } from "@/components/ui/switch";
import { FlaskConical } from "lucide-react";

export default function TestLeadToggle({ includeTest, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <FlaskConical className="w-3.5 h-3.5 text-graphite-muted" />
      <span className="text-xs text-graphite-muted">Test leads</span>
      <Switch 
        checked={includeTest} 
        onCheckedChange={onChange}
        className="h-4 w-7 data-[state=checked]:bg-brand-red"
      />
    </div>
  );
}