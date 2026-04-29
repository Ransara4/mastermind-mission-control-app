"use client";

import { Clock, Zap, AlertTriangle } from "lucide-react";
import type { MLDashboard } from "@/lib/ml-types";

const RISK_COLORS: Record<string, string> = {
  low: "bg-dark-success/20 text-dark-success",
  medium: "bg-dark-warn/20 text-dark-warn",
  high: "bg-dark-danger/20 text-dark-danger",
};

export default function LastRunDetail({
  lastRun,
}: {
  lastRun: MLDashboard["lastRun"];
}) {
  if (!lastRun) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Last Evolution Run
        </h3>
        <div className="flex items-center justify-center py-8 text-dark-muted">
          No evolution runs recorded yet
        </div>
      </div>
    );
  }

  const riskColors =
    RISK_COLORS[lastRun.riskLevel] || "bg-dark-panel2 text-dark-text";

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold tracking-tight text-dark-text">
          Last Evolution Run
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-dark-muted">
          <Clock size={12} />
          {new Date(lastRun.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Zap size={16} className="text-cm-purple" />
          <span className="text-sm font-mono font-dm-mono text-dark-text">
            {lastRun.geneId?.replace("gene_gep_", "") ?? "—"}
          </span>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${riskColors}`}>
            {lastRun.riskLevel} risk
          </span>
        </div>

        {lastRun.mutation && (
          <div className="bg-dark-panel2 rounded-lg p-3">
            <p className="text-xs font-medium text-dark-muted mb-1">Mutation</p>
            <p className="text-sm text-dark-text">
              {lastRun.mutation.expected_effect}
            </p>
            <p className="text-xs text-dark-muted mt-1 font-mono font-dm-mono">
              {lastRun.mutation.id}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-dark-muted">
          <AlertTriangle size={14} className="text-dark-warn" />
          <span>
            Blast radius: {lastRun.blastRadius.files} files / {lastRun.blastRadius.lines} lines
          </span>
        </div>

        <div>
          <p className="text-xs font-medium text-dark-muted mb-1">Signals</p>
          <div className="flex flex-wrap gap-1">
            {lastRun.signals.map((sig, i) => (
              <span
                key={i}
                className="inline-block px-1.5 py-0.5 bg-dark-panel2 text-dark-muted rounded text-xs"
              >
                {sig.length > 40 ? sig.slice(0, 40) + "..." : sig}
              </span>
            ))}
          </div>
        </div>

        {lastRun.selectorReason.length > 0 && (
          <div>
            <p className="text-xs font-medium text-dark-muted mb-1">
              Selector Reasoning
            </p>
            <ul className="text-xs text-dark-muted space-y-0.5">
              {lastRun.selectorReason.map((reason, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-dark-muted mt-0.5">-</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
