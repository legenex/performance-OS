import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Landmark, FileText, Users, BarChart3,
  Upload, Settings, Database, ChevronLeft, ChevronRight
} from "lucide-react";

const navGroups = [
  {
    label: "MONEY",
    items: [
      { label: "Command Center", path: "/", icon: LayoutDashboard },
      { label: "Cash & Banking", path: "/cash-banking", icon: Landmark },
      { label: "Receivables", path: "/receivables", icon: FileText },
      { label: "Payables", path: "/payables", icon: Users },
      { label: "True P&L", path: "/pnl", icon: BarChart3 },
    ]
  },
  {
    label: "OPS",
    items: [
      { label: "Import Center", path: "/import", icon: Upload },
      { label: "Data & Sources", path: "/data-sources", icon: Database },
    ]
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Settings", path: "/settings", icon: Settings },
    ]
  }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside className={`h-full bg-graphite-base border-r border-graphite-border flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-graphite-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-red rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">PerformanceOS</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center mx-auto">
            <span className="text-white text-xs font-bold">L</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="text-[10px] font-semibold text-graphite-muted uppercase tracking-widest px-2 mb-1.5">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? 'bg-brand-red/10 text-brand-red font-medium'
                        : 'text-graphite-muted hover:text-foreground hover:bg-graphite-lighter'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-red' : ''}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 border-t border-graphite-border flex items-center justify-center text-graphite-muted hover:text-foreground transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}