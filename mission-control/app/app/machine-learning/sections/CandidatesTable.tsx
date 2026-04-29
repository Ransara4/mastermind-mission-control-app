"use client";

import { useState } from "react";
import { Lightbulb, CheckCircle2, Clock, Archive } from "lucide-react";
import type { CapabilityCandidate, MLDashboard } from "@/lib/ml-types";

const SOURCE_COLORS: Record<string, string> = {
  transcript: "bg-cm-purple/20 text-cm-purple",
  user: "bg-cm-purple/20 text-cm-purple",
  signal: "bg-dark-panel2 border border-dark-border text-dark-muted",
  signals: "bg-dark-panel2 border border-dark-border text-dark-muted",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Open", color: "bg-cm-purple/20 text-cm-purple", icon: Clock },
  implemented: { label: "Done", color: "bg-dark-success/20 text-dark-success", icon: CheckCircle2 },
  stale: { label: "Stale", color: "bg-dark-panel2 text-dark-muted", icon: Archive },
  dismissed: { label: "Dismissed", color: "bg-dark-danger/20 text-dark-danger", icon: Archive },
};

type FilterStatus = "all" | "open" | "implemented" | "stale";

export default function CandidatesTable({
  candidates,
  candidateStats,
}: {
  candidates: CapabilityCandidate[];
  candidateStats?: MLDashboard["candidateStats"];
}) {
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filtered = filter === "all"
    ? candidates
    : candidates.filter((c) => (c.status || "open") === filter);

  const stats = candidateStats || { open: candidates.length, implemented: 0, stale: 0, dismissed: 0 };

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={18} className="text-dark-warn" />
        <h3 className="text-lg font-semibold tracking-tight text-dark-text">Candidates</h3>
        <span className="ml-auto text-sm text-dark-muted">
          {candidates.length} total
        </span>
      </div>

      <div className="flex gap-3 mb-4 text-xs">
        {[
          { key: "all" as const, label: "All", count: candidates.length, color: "text-dark-muted" },
          { key: "open" as const, label: "Open", count: stats.open, color: "text-cm-purple" },
          { key: "implemented" as const, label: "Done", count: stats.implemented, color: "text-dark-success" },
          { key: "stale" as const, label: "Stale", count: stats.stale, color: "text-dark-muted" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-1 rounded-md transition-colors ${
              filter === f.key
                ? "bg-cm-purple text-white"
                : `bg-dark-panel2 ${f.color} hover:bg-dark-border`
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-dark-muted">
          No {filter === "all" ? "" : filter + " "}candidates
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => {
            const status = c.status || "open";
            const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.open;
            const sourceColors = SOURCE_COLORS[c.source] || "bg-dark-panel2 text-dark-text";
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={`${c.id}-${i}`}
                className={`border rounded-lg p-4 ${status === "stale" ? "opacity-60" : ""} ${
                  status === "implemented" ? "border-dark-success/30 bg-dark-success/5" : "border-dark-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon size={14} className={statusConfig.color.split(" ")[1]} />
                    <h4 className="text-sm font-medium text-dark-text">{c.title}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sourceColors}`}>
                      {c.source}
                    </span>
                  </div>
                </div>
                {c.shape.evidence && (
                  <p className="text-xs text-dark-muted mb-2">
                    {c.shape.evidence.length > 120 ? c.shape.evidence.slice(0, 120) + "..." : c.shape.evidence}
                  </p>
                )}
                {c.implementedBy && (
                  <p className="text-xs text-dark-success mb-2">
                    Implemented by {c.implementedBy}
                    {c.implementedAt && ` on ${new Date(c.implementedAt).toLocaleDateString()}`}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {c.signals.slice(0, 5).map((sig, i) => (
                    <span key={i} className="inline-block px-1.5 py-0.5 bg-dark-panel2 text-dark-muted rounded text-xs">
                      {sig.length > 30 ? sig.slice(0, 30) + "..." : sig}
                    </span>
                  ))}
                  {c.signals.length > 5 && (
                    <span className="text-xs text-dark-muted">+{c.signals.length - 5} more</span>
                  )}
                </div>
                <p className="text-xs text-dark-muted mt-2">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
