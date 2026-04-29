"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import type { FixQueueItem } from "@/lib/seo-types";

interface Props {
  items: FixQueueItem[];
  domain: string;
  onFixed: () => void;
}

function severityScore(severity: string): number {
  if (severity === "critical") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function fixTypeScore(fixType: string): number {
  if (fixType === "auto") return 3;
  if (fixType === "claude") return 2;
  return 1;
}

function impactScore(item: FixQueueItem): number {
  return severityScore(item.severity) * 2 + fixTypeScore(item.fixType);
}

function mapToLevel(score: number, min: number, max: number): number {
  if (max === min) return 3;
  const normalized = (score - min) / (max - min);
  return Math.max(1, Math.min(5, Math.round(normalized * 4) + 1));
}

export default function QuickWins({ items, domain, onFixed }: Props) {
  const [fixingId, setFixingId] = useState<string | null>(null);

  const pendingItems = items.filter((i) => i.status === "pending");

  const scored = pendingItems.map((item) => ({
    item,
    score: impactScore(item),
  }));

  scored.sort((a, b) => b.score - a.score);
  const topScored = scored.slice(0, 5);

  const minScore = topScored.length > 0 ? topScored[topScored.length - 1].score : 0;
  const maxScore = topScored.length > 0 ? topScored[0].score : 0;

  const handleFixOne = async (item: FixQueueItem) => {
    if (!item.fixAction || !item.fixParams?.value) return;
    setFixingId(item.id);
    try {
      const res = await fetch("/api/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          directAction: { type: item.fixAction, value: item.fixParams.value },
        }),
      });
      const data = await res.json();
      const result = data.results?.[0];
      if (res.ok && result?.status === "fixed") {
        onFixed();
      }
    } catch (err) {
      console.error("Quick win fix failed:", err);
    } finally {
      setFixingId(null);
    }
  };

  if (topScored.length === 0) return null;

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-cm-purple" />
        <h3 className="text-sm font-semibold tracking-tight text-dark-text">Quick Wins</h3>
        <span className="text-xs text-dark-muted bg-dark-panel2 px-2 py-0.5 rounded-full">
          Top {topScored.length} by impact
        </span>
      </div>

      <div>
        {topScored.map(({ item, score }) => {
          const level = mapToLevel(score, minScore, maxScore);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2.5 border-b border-dark-border last:border-0"
            >
              {/* Impact dots */}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`w-1.5 h-1.5 rounded-full ${
                      n <= level ? "bg-cm-purple" : "bg-dark-panel2"
                    }`}
                  />
                ))}
              </div>

              {/* Severity badge */}
              <span
                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  item.severity === "critical"
                    ? "bg-dark-danger/20 text-dark-danger"
                    : item.severity === "warning"
                      ? "bg-dark-warn/20 text-dark-warn"
                      : "bg-cm-purple/20 text-cm-purple"
                }`}
              >
                {item.severity}
              </span>

              {/* Message */}
              <span className="flex-1 text-sm text-dark-text truncate">
                {item.message}
              </span>

              {/* Fix type badge */}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  item.fixType === "auto"
                    ? "bg-dark-success/20 text-dark-success"
                    : item.fixType === "claude"
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-dark-panel2 text-dark-muted"
                }`}
              >
                {item.fixType === "auto"
                  ? "API"
                  : item.fixType === "claude"
                    ? "Browser"
                    : "Manual"}
              </span>

              {/* Fix button for auto items */}
              {item.fixType === "auto" && item.fixAction && (
                <button
                  onClick={() => handleFixOne(item)}
                  disabled={fixingId === item.id}
                  className="text-xs px-2 py-1 bg-cm-purple text-white rounded hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
                >
                  {fixingId === item.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Fix"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
