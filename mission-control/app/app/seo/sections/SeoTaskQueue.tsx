"use client";

import { useState, useEffect, useCallback } from "react";
import { Terminal, RefreshCw, Clock, CheckCircle2, Loader2, AlertCircle, User, CircleDot } from "lucide-react";

interface Card {
  _id: string;
  title: string;
  description: string;
  labels: string[];
  priority: "Low" | "Med" | "High";
  column: string;
  createdAt: number;
  updatedAt: number;
  executorStatus?: string;
}

interface Props {
  domain?: string; // if provided, further filter by domain
}

const COLUMN_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "claude-code-todo": { label: "Queued", color: "bg-dark-warn/20 text-dark-warn border-dark-warn/30", icon: <Terminal size={11} /> },
  "doing":            { label: "Running", color: "bg-cm-purple/20 text-cm-purple border-cm-purple/30",   icon: <Loader2 size={11} className="animate-spin" /> },
  "review":           { label: "Review",  color: "bg-cm-purple-mid/20 text-cm-purple-mid border-cm-purple-mid/30", icon: <CircleDot size={11} /> },
  "human-must-do":    { label: "Needs You", color: "bg-dark-panel2 text-dark-muted border-dark-border", icon: <User size={11} /> },
  "done":             { label: "Done",    color: "bg-dark-success/20 text-dark-success border-dark-success/30", icon: <CheckCircle2 size={11} /> },
};

const PRIORITY_COLOR: Record<string, string> = {
  High: "text-dark-danger",
  Med:  "text-dark-warn",
  Low:  "text-dark-muted",
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isSeoDomainCard(card: Card, domain?: string): boolean {
  const isSeo =
    card.labels?.some((l) => l.toLowerCase() === "seo") ||
    card.title.startsWith("SEO:") ||
    card.title.toLowerCase().includes("seo");
  if (!isSeo) return false;
  if (!domain) return true;
  // Further filter by domain mention
  const domainInTitle = card.title.toLowerCase().includes(domain.toLowerCase());
  const domainInDesc = card.description?.toLowerCase().includes(domain.toLowerCase());
  return domainInTitle || domainInDesc;
}

const COLUMN_ORDER = ["doing", "claude-code-todo", "human-must-do", "review", "done"];

export default function SeoTaskQueue({ domain }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch("/api/db");
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      const seoCards: Card[] = (data.cards || []).filter((c: Card) =>
        isSeoDomainCard(c, domain)
      );
      // Sort: active first (doing > queued > review > human), then done last; within group by updatedAt desc
      seoCards.sort((a, b) => {
        const ai = COLUMN_ORDER.indexOf(a.column);
        const bi = COLUMN_ORDER.indexOf(b.column);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return b.updatedAt - a.updatedAt;
      });
      setCards(seoCards);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchCards();
    const interval = setInterval(fetchCards, 30000);
    return () => clearInterval(interval);
  }, [fetchCards]);

  const active = cards.filter((c) => c.column !== "done");
  const done = cards.filter((c) => c.column === "done").slice(0, 5);
  const visible = [...active, ...done];

  // Hide entirely when loading or no tasks — only surfaces when there's real work
  if (loading) return null;
  if (visible.length === 0) return null;

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-dark-text flex items-center gap-2">
          <Terminal size={16} className="text-cm-purple" />
          Claude Code Queue
          {active.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-cm-purple/20 text-cm-purple rounded-full">
              {active.length} active
            </span>
          )}
        </h3>
        <button
          onClick={fetchCards}
          className="p-1.5 text-dark-muted hover:text-dark-text rounded-lg hover:bg-dark-panel2 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-dark-danger mb-3">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="space-y-2">
          {visible.map((card) => {
            const meta = COLUMN_META[card.column];
            const isOpen = expanded === card._id;
            return (
              <div
                key={card._id}
                className={`rounded-lg border transition-colors ${
                  card.column === "done"
                    ? "border-dark-border bg-dark-panel2"
                    : "border-dark-border bg-dark-panel hover:border-cm-purple/30"
                }`}
              >
                {/* Row */}
                <button
                  className="w-full text-left px-3 py-2.5 flex items-start gap-3"
                  onClick={() => setExpanded(isOpen ? null : card._id)}
                >
                  {/* Status badge */}
                  {meta ? (
                    <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${meta.color}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  ) : (
                    <span className="mt-0.5 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border border-dark-border bg-dark-panel2 text-dark-muted">
                      {card.column}
                    </span>
                  )}

                  {/* Title */}
                  <span className={`flex-1 text-sm leading-snug ${card.column === "done" ? "text-dark-muted line-through" : "text-dark-text"}`}>
                    {card.title.replace(/^SEO:\s*/i, "")}
                  </span>

                  {/* Right side */}
                  <div className="shrink-0 flex items-center gap-2 ml-2">
                    <span className={`text-xs font-medium ${PRIORITY_COLOR[card.priority] || "text-dark-muted"}`}>
                      {card.priority}
                    </span>
                    <span className="text-xs text-dark-muted flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(card.updatedAt)}
                    </span>
                  </div>
                </button>

                {/* Expanded description */}
                {isOpen && card.description && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="text-xs text-dark-muted bg-dark-panel2 rounded-lg p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto border border-dark-border">
                      {card.description.slice(0, 1200)}
                      {card.description.length > 1200 && "\n…(truncated)"}
                    </div>
                    {card.executorStatus && (
                      <p className="mt-2 text-xs text-dark-muted">
                        Executor: <span className="font-medium">{card.executorStatus}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Done count overflow */}
          {cards.filter((c) => c.column === "done").length > 5 && (
            <p className="text-xs text-dark-muted text-center pt-1">
              + {cards.filter((c) => c.column === "done").length - 5} more completed tasks
            </p>
          )}
        </div>

      <p className="text-xs text-dark-muted mt-3">Auto-refreshes every 30s</p>
    </div>
  );
}
