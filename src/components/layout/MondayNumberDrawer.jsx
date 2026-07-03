import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMoney, isNegative } from "@/lib/formatters";
import { Link } from "react-router-dom";
import { Landmark, FileText, Users } from "lucide-react";

export default function MondayNumberDrawer({ open, onClose, snapshot }) {
  if (!snapshot) return null;
  const { cash = 0, ar_total = 0, ap_total = 0, media_gap = 0, monday_number = 0 } = snapshot;

  const rows = [
    { label: "Cash Balances", value: cash, icon: Landmark, link: "/cash-banking", sign: "+" },
    { label: "Accounts Receivable", value: ar_total, icon: FileText, link: "/receivables", sign: "+" },
    { label: "Accounts Payable", value: ap_total, icon: Users, link: "/payables", sign: "−", invert: true },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="bg-graphite-panel border-graphite-border w-96">
        <SheetHeader>
          <SheetTitle className="text-foreground">Monday Number Decomposition</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-1">
          {rows.map((r) => {
            const displayVal = r.invert ? r.value : r.value;
            const neg = r.invert;
            return (
              <Link
                key={r.label}
                to={r.link}
                onClick={onClose}
                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-graphite-lighter transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <r.icon className="w-4 h-4 text-graphite-muted group-hover:text-foreground transition-colors" />
                  <div>
                    <div className="text-sm text-foreground">{r.label}</div>
                    <div className="text-[10px] text-graphite-muted">{r.sign}</div>
                  </div>
                </div>
                <span className={`font-mono text-sm tabular-nums font-medium ${neg ? 'text-brand-coral' : 'text-foreground'}`}>
                  {neg && '('}${formatMoney(displayVal)}{neg && ')'}
                </span>
              </Link>
            );
          })}
          <div className="border-t border-graphite-border mt-2 pt-3 flex items-center justify-between px-3">
            <span className="text-sm font-medium text-foreground">Monday Number</span>
            <span className={`font-mono text-lg font-bold tabular-nums ${isNegative(monday_number) ? 'text-brand-coral' : 'text-foreground'}`}>
              ${formatMoney(monday_number)}
            </span>
          </div>
          {media_gap !== 0 && (
            <div className="flex items-center justify-between px-3 pt-1">
              <span className="text-xs text-graphite-muted">Media Gap (memo)</span>
              <span className={`font-mono text-xs tabular-nums ${isNegative(media_gap) ? 'text-brand-coral' : 'text-emerald-400'}`}>
                ${formatMoney(media_gap)}
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}