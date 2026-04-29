"use client";

import { Database } from "lucide-react";
import type { MLDashboard } from "@/lib/ml-types";

const KIND_COLORS: Record<string, string> = {
  signal: "bg-cm-purple/20 text-cm-purple",
  hypothesis: "bg-cm-purple/20 text-cm-purple",
  attempt: "bg-dark-warn/20 text-dark-warn",
  outcome: "bg-dark-success/20 text-dark-success",
  lesson: "bg-cm-purple/20 text-cm-purple-mid",
};

const PIPELINE_STAGES = ["signal", "hypothesis", "attempt", "outcome", "lesson"];
const STAGE_DESCRIPTIONS: Record<string, string> = {
  signal: "Detected patterns or errors",
  hypothesis: "Proposed fixes from signals",
  attempt: "Mutations applied to codebase",
  outcome: "Results of each attempt",
  lesson: "Knowledge retained from outcomes",
};

export default function MemoryGraphSummary({
  memoryGraph,
}: {
  memoryGraph: MLDashboard["memoryGraph"];
}) {
  const byKind = memoryGraph.byKind;
  const pipelineStages = PIPELINE_STAGES.filter((s) => byKind[s] !== undefined && byKind[s] > 0);
  const otherKinds = Object.entries(byKind).filter(([k]) => !PIPELINE_STAGES.includes(k));

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Database size={18} className="text-dark-muted" />
        <h3 className="text-lg font-semibold tracking-tight text-dark-text">Memory Graph</h3>
        <span className="ml-auto text-sm text-dark-muted">
          {memoryGraph.total} events
        </span>
      </div>

      {memoryGraph.total === 0 ? (
        <div className="flex items-center justify-center py-8 text-dark-muted">
          No memory graph events yet
        </div>
      ) : (
        <div>
          {/* Pipeline flow visualization */}
          {pipelineStages.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-dark-muted uppercase mb-3">Evolution Pipeline</p>
              <div className="flex items-center gap-0 overflow-x-auto">
                {pipelineStages.map((stage, i) => {
                  const count = byKind[stage] || 0;
                  const colors = KIND_COLORS[stage] || "bg-dark-panel2 text-dark-text";
                  const maxCount = Math.max(...pipelineStages.map((s) => byKind[s] || 0), 1);
                  const barWidth = Math.max(20, (count / maxCount) * 100);

                  return (
                    <div key={stage} className="flex items-center">
                      <div className={`rounded-lg p-3 ${colors} text-center`} style={{ minWidth: "80px" }}>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-xs font-medium capitalize">{stage}</p>
                        <div
                          className="mt-1.5 h-1 rounded-full bg-current opacity-30 mx-auto"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {i < pipelineStages.length - 1 && (
                        <span className="text-dark-muted text-lg px-1 flex-shrink-0">&rarr;</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Stage descriptions */}
              <div className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-1">
                {pipelineStages.map((stage) => (
                  <p key={stage} className="text-xs text-dark-muted">
                    <span className="capitalize font-medium">{stage}:</span>{" "}
                    {STAGE_DESCRIPTIONS[stage]}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Conversion rates between stages */}
          {pipelineStages.length >= 2 && (
            <div className="mb-4 border-t border-dark-border pt-3">
              <p className="text-xs font-medium text-dark-muted uppercase mb-2">Stage Conversion</p>
              <div className="flex flex-wrap gap-3">
                {pipelineStages.slice(0, -1).map((stage, i) => {
                  const next = pipelineStages[i + 1];
                  const from = byKind[stage] || 0;
                  const to = byKind[next] || 0;
                  const rate = from > 0 ? ((to / from) * 100).toFixed(0) : "—";
                  return (
                    <div key={`${stage}-${next}`} className="bg-dark-panel2 rounded-lg px-3 py-2 text-xs">
                      <span className="text-dark-muted capitalize">{stage}</span>
                      <span className="text-dark-muted mx-1">&rarr;</span>
                      <span className="text-dark-muted capitalize">{next}</span>
                      <span className="text-dark-text font-bold ml-2">{rate}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other event kinds (non-pipeline) */}
          {otherKinds.length > 0 && (
            <div className="border-t border-dark-border pt-3">
              <p className="text-xs font-medium text-dark-muted uppercase mb-2">Other Events</p>
              <div className="flex flex-wrap gap-3">
                {otherKinds
                  .sort(([, a], [, b]) => b - a)
                  .map(([kind, count]) => {
                    const colors = KIND_COLORS[kind] || "bg-dark-panel2 text-dark-text";
                    return (
                      <div
                        key={kind}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors}`}
                      >
                        <span className="text-sm font-medium capitalize">{kind}</span>
                        <span className="text-lg font-bold">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
