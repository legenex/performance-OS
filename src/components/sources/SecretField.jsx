import React, { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

export default function SecretField({ label, value, secret }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-graphite-muted uppercase tracking-wider w-16 shrink-0">{label}</span>
      <code className="flex-1 text-[11px] font-mono text-foreground bg-graphite-base border border-graphite-border rounded px-2 py-1 truncate">
        {secret && !shown ? '••••••••••••••••' : value}
      </code>
      {secret && (
        <button onClick={() => setShown(!shown)} className="text-graphite-muted hover:text-foreground shrink-0">
          {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
      <button onClick={copy} className="text-graphite-muted hover:text-foreground shrink-0">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}