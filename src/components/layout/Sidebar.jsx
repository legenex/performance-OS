import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Landmark, FileText, Users, BarChart3,
  Upload, Settings, Database, ChevronLeft, ChevronRight, ChevronDown,
  Radar, CreditCard, Compass, Sparkles, BookOpen,
  ClipboardList, Activity, Building2, Boxes, Map, Filter, Receipt,
  PieChart, Target, ClipboardCheck, ShieldCheck
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { canAccess } from "@/lib/roles";

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
    label: "PERFORMANCE",
    items: [
      { label: "Overview", path: "/performance", icon: PieChart },
      { label: "Buyer Report", path: "/performance/buyers", icon: Building2 },
      { label: "Supplier Performance", path: "/performance/suppliers", icon: Boxes },
      { label: "State Report", path: "/performance/states", icon: Map },
      { label: "Lead Quality", path: "/performance/lead-quality", icon: Filter },
      { label: "Campaign True Margin", path: "/performance/campaign-margin", icon: Target },
      { label: "Report Builder", path: "/performance/report-builder", icon: ClipboardList },
    ]
  },
  {
    label: "AD INTELLIGENCE",
    items: [
      { label: "Ad Command", path: "/ad-command", icon: Radar },
      { label: "Ad Accounts", path: "/ad-accounts", icon: CreditCard },
      { label: "Campaign Explorer", path: "/campaign-explorer", icon: Compass },
      { label: "Creative Intelligence", path: "/creative-intelligence", icon: Sparkles },
      { label: "Knowledge Base", path: "/knowledge-base", icon: BookOpen },
    ]
  },
  {
    label: "OPS",
    items: [
      { label: "Ops Board", path: "/ops-board", icon: ClipboardList },
      { label: "Pipeline Health", path: "/pipeline-health", icon: Activity },
      { label: "Buyers", path: "/buyers", icon: Building2 },
      { label: "Suppliers", path: "/suppliers", icon: Boxes },
      { label: "States & Tiers", path: "/states-tiers", icon: Map },
      { label: "Qualification", path: "/qualification", icon: ClipboardCheck },
      { label: "Billing & Recon", path: "/billing-recon", icon: Receipt },
      { label: "Import Center", path: "/import", icon: Upload },
      { label: "Data & Sources", path: "/data-sources", icon: Database },
    ]
  },
  {
    label: "AI",
    items: [
      { label: "Daily Briefing", path: "/daily-briefing", icon: Sparkles },
    ]
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Settings", path: "/settings", icon: Settings },
      { label: "Users & Roles", path: "/users", icon: ShieldCheck },
    ]
  }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState({});

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => canAccess(user, i.path)) }))
    .filter((g) => g.items.length > 0);

  const isGroupOpen = (label) => openGroups[label] !== false; // open by default

  return (
    <aside className={`h-full bg-graphite-sidebar border-r border-graphite-border flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-graphite-border shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-red rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">PerformanceOS</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center mx-auto">
            <span className="text-white text-xs font-bold">L</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {visibleGroups.map((group) => {
          const open = isGroupOpen(group.label);
          return (
            <div key={group.label}>
              {!collapsed && (
                <button
                  onClick={() => setOpenGroups((p) => ({ ...p, [group.label]: !open }))}
                  className="w-full flex items-center justify-between px-2 mb-1.5 group"
                >
                  <span className="text-[10px] font-semibold text-graphite-muted uppercase tracking-widest">{group.label}</span>
                  <ChevronDown className={`w-3 h-3 text-graphite-faint transition-transform ${open ? '' : '-rotate-90'}`} />
                </button>
              )}
              {(collapsed || open) && (
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
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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