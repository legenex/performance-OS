import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Landmark, FileText, Users, BarChart3,
  Settings, ChevronLeft, ChevronRight, ChevronDown,
  Radar, CreditCard, Compass, Sparkles, BookOpen,
  ClipboardList, TrendingUp, Boxes, Map, Filter, Receipt,
  Target, Table2, ShieldCheck, UserCog
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { canAccess } from "@/lib/roles";

const navGroups = [
  {
    label: "Finances",
    items: [
      { label: "Command Center", path: "/", icon: LayoutDashboard },
      { label: "Cash & Banking", path: "/cash-banking", icon: Landmark },
      { label: "Receivables & Invoicing", path: "/receivables", icon: FileText },
      { label: "Payables & Supplier Ledger", path: "/payables", icon: Users },
      { label: "True P&L", path: "/pnl", icon: BarChart3 },
    ],
  },
  {
    label: "PERFORMANCE",
    items: [
      { label: "Overview", path: "/performance", icon: TrendingUp },
      { label: "Buyer Report", path: "/performance/buyers", icon: Users },
      { label: "Supplier Performance", path: "/performance/suppliers", icon: Boxes },
      { label: "State Report", path: "/performance/states", icon: Map },
      { label: "Lead Quality", path: "/performance/lead-quality", icon: ShieldCheck },
      { label: "Campaign True Margin", path: "/performance/campaign-margin", icon: Target },
      { label: "Report Builder", path: "/performance/report-builder", icon: Table2 },
    ],
  },
  {
    label: "AD INTELLIGENCE",
    items: [
      { label: "Ad Command", path: "/ad-command", icon: Radar },
      { label: "Ad Accounts", path: "/ad-accounts", icon: CreditCard },
      { label: "Campaign Explorer", path: "/campaign-explorer", icon: Compass },
      { label: "Creative Intelligence", path: "/creative-intelligence", icon: Sparkles },
      { label: "Knowledge Base", path: "/knowledge-base", icon: BookOpen },
    ],
  },
  {
    label: "OPS",
    items: [
      { label: "Ops Board", path: "/ops-board", icon: ClipboardList },
      { label: "Buyers", path: "/buyers", icon: Users },
      { label: "Suppliers", path: "/suppliers", icon: Boxes },
      { label: "States & Tiers", path: "/states-tiers", icon: Map },
      { label: "Qualification", path: "/qualification", icon: Filter },
      { label: "Billing & Recon", path: "/billing-recon", icon: Receipt },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Settings", path: "/settings", icon: Settings },
      { label: "Users & Roles", path: "/users", icon: UserCog },
    ],
  },
  {
    label: "AI",
    items: [
      { label: "Daily Briefing", path: "/daily-briefing", icon: Sparkles },
    ],
  },
];

const STORAGE_KEY = "pos_sidebar_groups";

function isItemActive(pathname, itemPath) {
  if (itemPath === "/") return pathname === "/";
  // exact or nested, but /performance shouldn't swallow /performance/buyers as "Overview"
  return pathname === itemPath;
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { user } = useAuth();

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => canAccess(user, i.path)) }))
    .filter((g) => g.items.length > 0);

  // Persisted expand/collapse state per group.
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved && typeof saved === "object") return saved;
    } catch { /* ignore */ }
    return {};
  });

  // Ensure the group containing the active screen is expanded by default.
  useEffect(() => {
    const activeGroup = navGroups.find((g) => g.items.some((i) => isItemActive(location.pathname, i.path)));
    if (activeGroup) {
      setExpanded((prev) => (prev[activeGroup.label] === undefined || prev[activeGroup.label] === false
        ? { ...prev, [activeGroup.label]: true }
        : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded)); } catch { /* ignore */ }
  }, [expanded]);

  function isOpen(label) {
    return expanded[label] !== false; // default open unless explicitly collapsed
  }
  function toggleGroup(label) {
    setExpanded((prev) => ({ ...prev, [label]: prev[label] === false ? true : false }));
  }

  return (
    <aside className={`h-full bg-graphite-sidebar border-r border-graphite-border flex flex-col transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
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
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {visibleGroups.map((group) => {
          const open = isOpen(group.label);
          return (
            <div key={group.label}>
              {collapsed ? (
                <div className="h-px bg-graphite-border my-2 mx-1" />
              ) : (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] font-semibold text-graphite-muted uppercase tracking-widest hover:text-foreground transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
                </button>
              )}

              {(collapsed || open) && (
                <div className="space-y-0.5 mt-0.5">
                  {group.items.map((item) => {
                    const active = isItemActive(location.pathname, item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-brand-redSelected text-brand-red font-medium"
                            : "text-graphite-muted hover:text-foreground hover:bg-graphite-elevated"
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-brand-red" : ""}`} />
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