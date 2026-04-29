"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Activity, ChevronDown, ChevronRight } from "lucide-react";
import type { FeedbackStats, FeedbackEntry } from "@/lib/ml-types";

export default function FeedbackLoop({
  feedback,
}: {
  feedback: (FeedbackStats & { entries?: FeedbackEntry[] }) | undefined;
}) {
  if (!feedback || feedback.total === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Feedback Loop</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-dark-muted">
          No feedback data yet — fixes will be tracked after the first evolution cycle
        </div>
      </div>
    );
  }

  const segments = [
    { label: "Proven", value: feedback.proven, color: "bg-cm-purple", textColor: "text-dark-success" },
    { label: "Pending", value: feedback.pending, color: "bg-cm-purple", textColor: "text-dark-warn" },
    { label: "Failed", value: feedback.failed, color: "bg-dark-danger", textColor: "text-dark-danger" },
  ];

  const rate = (feedback.success_rate * 100).toFixed(0);

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Feedback Loop</h3>
        </div>
        <span className="text-sm text-dark-muted">{feedback.total} tracked fixes</span>
      </div>

      {/* Success rate */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-dark-muted">Fix Success Rate</span>
          <span className="text-2xl font-bold text-dark-text">{rate}%</span>
        </div>
        <div className="h-3 bg-dark-panel2 rounded-full overflow-hidden flex">
          {segments.map((seg) =>
            seg.value > 0 ? (
              <div
                key={seg.label}
                className={`${seg.color} transition-all`}
                style={{ width: `${(seg.value / feedback.total) * 100}%` }}
              />
            ) : null
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 p-3 bg-dark-success/10 rounded-lg">
          <CheckCircle2 size={16} className="text-dark-success" />
          <div>
            <p className="text-lg font-bold text-dark-success">{feedback.proven}</p>
            <p className="text-xs text-dark-success/80">Proven</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-dark-warn/10 rounded-lg">
          <Clock size={16} className="text-dark-warn" />
          <div>
            <p className="text-lg font-bold text-dark-warn">{feedback.pending}</p>
            <p className="text-xs text-dark-warn/80">Pending</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-dark-danger/10 rounded-lg">
          <XCircle size={16} className="text-dark-danger" />
          <div>
            <p className="text-lg font-bold text-dark-danger">{feedback.failed}</p>
            <p className="text-xs text-dark-danger/80">Failed</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-dark-muted mt-3">
        Fixes are proven after 3 clean cycles, failed after 5 recurrences
      </p>

      {/* Individual entries */}
      {feedback.entries && feedback.entries.length > 0 && (
        <FeedbackEntries entries={feedback.entries} />
      )}
    </div>
  );
}

function FeedbackEntries({ entries }: { entries: FeedbackEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = entries.slice(0, 20);

  const STATUS_ICON: Record<string, { icon: typeof Clock; color: string }> = {
    proven: { icon: CheckCircle2, color: "text-dark-success" },
    pending: { icon: Clock, color: "text-dark-warn" },
    failed: { icon: XCircle, color: "text-dark-danger" },
  };

  return (
    <div className="mt-4 border-t border-dark-border pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-dark-muted hover:text-dark-text transition-colors w-full"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Individual Entries ({entries.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
          {visible.map((entry, i) => {
            const cfg = STATUS_ICON[entry.status] || STATUS_ICON.pending;
            const Icon = cfg.icon;
            return (
              <div key={`${entry.error_hash}-${i}`} className="flex items-start gap-2 p-2 bg-dark-panel2 rounded-lg text-xs">
                <Icon size={14} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono font-dm-mono text-dark-text truncate">
                      {entry.gene_id?.replace("gene_gep_", "") ?? entry.gene_id}
                    </span>
                    <span className={`${cfg.color} font-medium`}>{entry.status}</span>
                  </div>
                  {entry.signals.length > 0 && (
                    <p className="text-dark-muted truncate">
                      {entry.signals.slice(0, 2).join(", ")}
                      {entry.signals.length > 2 && ` +${entry.signals.length - 2}`}
                    </p>
                  )}
                  <p className="text-dark-muted">
                    Applied {new Date(entry.applied_at).toLocaleDateString()}
                    {entry.cycles_since > 0 && ` · ${entry.cycles_since} cycles since`}
                  </p>
                </div>
              </div>
            );
          })}
          {entries.length > 20 && (
            <p className="text-xs text-dark-muted text-center py-1">
              Showing 20 of {entries.length} entries
            </p>
          )}
        </div>
      )}
    </div>
  );
}
