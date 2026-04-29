"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, Zap, Wrench, Sparkles } from "lucide-react";
import type { EvolutionEvent } from "@/lib/ml-types";

const INTENT_CONFIG: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  innovate: { icon: Sparkles, color: "text-cm-purple", bg: "bg-cm-purple/10" },
  repair: { icon: Wrench, color: "text-dark-warn", bg: "bg-dark-warn/10" },
  optimize: { icon: Zap, color: "text-cm-purple", bg: "bg-cm-purple/10" },
};

type IntentFilter = "all" | "repair" | "optimize" | "innovate";

export default function EvolutionTimeline({ events }: { events: EvolutionEvent[] }) {
  const [filter, setFilter] = useState<IntentFilter>("all");
  const [expandedSignals, setExpandedSignals] = useState<Set<string>>(new Set());

  // Events arrive pre-sorted newest-first from the API
  const sorted = events;

  const filtered = filter === "all"
    ? sorted
    : sorted.filter((evt) => evt.intent === filter);

  const intentCounts = sorted.reduce<Record<string, number>>((acc, evt) => {
    acc[evt.intent] = (acc[evt.intent] || 0) + 1;
    return acc;
  }, {});

  const toggleSignals = (id: string) => {
    setExpandedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (sorted.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Evolution Timeline</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-dark-muted">
          No evolution events yet — first successful cycle will appear here
        </div>
      </div>
    );
  }

  const filters: { key: IntentFilter; label: string; color: string }[] = [
    { key: "all", label: "All", color: "text-dark-muted" },
    { key: "repair", label: "Repairs", color: "text-dark-warn" },
    { key: "optimize", label: "Optimizations", color: "text-cm-purple" },
    { key: "innovate", label: "Innovations", color: "text-cm-purple" },
  ];

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-dark-muted" />
        <h3 className="text-lg font-semibold tracking-tight text-dark-text">Evolution Timeline</h3>
        <span className="ml-auto text-sm text-dark-muted">{sorted.length} events</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-3 mb-4 text-xs">
        {filters.map((f) => {
          const count = f.key === "all" ? sorted.length : (intentCounts[f.key] || 0);
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2 py-1 rounded-md transition-colors ${
                filter === f.key
                  ? "bg-cm-purple text-white"
                  : `bg-dark-panel2 ${f.color} hover:bg-dark-border`
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((evt) => {
          const config = INTENT_CONFIG[evt.intent] || INTENT_CONFIG.repair;
          const Icon = config.icon;
          const success = evt.outcome?.status === "success";
          const timestamp = evt.meta?.at ? new Date(evt.meta.at as string).toLocaleString() : evt.id?.replace("evt_", "") ?? "unknown";
          const score = evt.outcome?.score;
          const showAllSignals = expandedSignals.has(evt.id);
          const visibleSignals = showAllSignals ? evt.signals : evt.signals?.slice(0, 4);
          const hiddenCount = (evt.signals?.length || 0) - 4;

          return (
            <div key={evt.id} className="border border-dark-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1 rounded ${config.bg}`}>
                  <Icon size={14} className={config.color} />
                </div>
                <span className={`text-xs font-medium uppercase ${config.color}`}>{evt.intent}</span>
                <span className="text-xs text-dark-muted ml-auto">{timestamp}</span>
                {success ? (
                  <CheckCircle2 size={14} className="text-cm-purple" />
                ) : (
                  <XCircle size={14} className="text-dark-muted" />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-dark-muted mb-1">
                <span
                  className="font-mono font-dm-mono cursor-default"
                  title={evt.genes_used?.[0] || "unknown"}
                >
                  {evt.genes_used?.[0] || "unknown"}
                </span>
                {score !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted">
                    {(score * 100).toFixed(0)}%
                  </span>
                )}
                {evt.blast_radius && (
                  <span className="text-dark-muted">
                    {evt.blast_radius.files}f / {evt.blast_radius.lines}L
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {visibleSignals?.map((sig, i) => (
                  <span
                    key={i}
                    className="inline-block px-1.5 py-0.5 bg-dark-panel2 text-dark-muted rounded text-xs cursor-default"
                    title={sig}
                  >
                    {sig.length > 25 ? sig.slice(0, 25) + "..." : sig}
                  </span>
                ))}
                {!showAllSignals && hiddenCount > 0 && (
                  <button
                    onClick={() => toggleSignals(evt.id)}
                    className="text-xs text-cm-purple hover:text-cm-purple/80 transition-colors"
                  >
                    +{hiddenCount} more
                  </button>
                )}
                {showAllSignals && (evt.signals?.length || 0) > 4 && (
                  <button
                    onClick={() => toggleSignals(evt.id)}
                    className="text-xs text-cm-purple hover:text-cm-purple/80 transition-colors"
                  >
                    show less
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-8 text-dark-muted">
            No {filter} events
          </div>
        )}
      </div>
    </div>
  );
}
