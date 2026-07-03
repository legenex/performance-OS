import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import SeverityBadge from "@/components/shared/SeverityBadge";

const icons = { critical: AlertCircle, warning: AlertTriangle, info: Info };

export default function AlertsStrip() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    base44.entities.Alert.filter({ resolved: false }, '-created_date', 10).then(setAlerts).catch(() => {});
  }, []);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-6">
      {visible.map(alert => {
        const Icon = icons[alert.severity] || Info;
        const bgColor = alert.severity === 'critical' ? 'bg-red-500/8 border-red-500/20' :
          alert.severity === 'warning' ? 'bg-amber-500/8 border-amber-500/20' : 'bg-blue-500/8 border-blue-500/20';
        return (
          <div key={alert.id} className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${bgColor}`}>
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
              <span className="text-sm text-foreground">{alert.message}</span>
              <SeverityBadge severity={alert.severity}>{alert.severity}</SeverityBadge>
            </div>
            <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))} className="text-graphite-muted hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}