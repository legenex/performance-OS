import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { askAi } from "@/functions/askAi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { Sparkles, X, Send } from "lucide-react";

const SCREEN_NAMES = {
  "/": "Command Center",
  "/cash-banking": "Cash & Banking",
  "/receivables": "Receivables",
  "/payables": "Payables",
  "/pnl": "True P&L",
  "/ad-command": "Ad Command",
  "/campaign-explorer": "Campaign Explorer",
  "/creative-intelligence": "Creative Intelligence",
  "/knowledge-base": "Knowledge Base",
  "/performance": "Performance Overview",
};

export default function AskAiPanel({ includeTest }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const screen = SCREEN_NAMES[location.pathname] || location.pathname;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function ask() {
    const question = q.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setQ("");
    setLoading(true);
    try {
      const res = await askAi({ question, screen, context: { path: location.pathname, includeTest } });
      setMessages((m) => [...m, { role: "assistant", content: res.data?.answer || "No answer." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I couldn't answer that. " + (e.message || "") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 h-11 px-4 rounded-full bg-brand-red text-white shadow-lg hover:bg-brand-red/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Ask AI</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-2.5rem)] bg-graphite-elevated border border-graphite-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="h-12 px-4 flex items-center justify-between border-b border-graphite-border shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-red" />
              <span className="text-sm font-semibold text-foreground">Ask AI</span>
              <span className="text-[10px] text-graphite-muted">· {screen}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-graphite-muted hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-graphite-faint mx-auto mb-2" />
                <p className="text-xs text-graphite-muted">Ask about the numbers on this screen.<br />Aggregate view only — no lead PII.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-brand-red text-white" : "bg-graphite-panel text-foreground border border-graphite-border"}`}>
                  {m.role === "user" ? m.content : <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-graphite-panel border border-graphite-border rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-graphite-border border-t-brand-red rounded-full animate-spin" />
                  <span className="text-xs text-graphite-muted">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-graphite-border flex items-center gap-2 shrink-0">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="Ask about this screen…"
              className="flex-1 bg-graphite-well border-graphite-border h-9 text-sm"
            />
            <Button size="icon" className="h-9 w-9 bg-brand-red hover:bg-brand-red/90 shrink-0" onClick={ask} disabled={loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}