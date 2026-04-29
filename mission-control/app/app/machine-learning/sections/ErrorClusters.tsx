"use client";

import { Layers, Circle } from "lucide-react";
import type { ErrorCluster } from "@/lib/ml-types";

export default function ErrorClusters({
  clusters,
  ollamaAvailable,
}: {
  clusters: ErrorCluster[] | undefined;
  ollamaAvailable: boolean;
}) {
  const sorted = [...(clusters || [])].sort((a, b) => b.error_count - a.error_count);

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Error Clusters</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle
            size={8}
            className={ollamaAvailable ? "fill-green-500 text-green-500" : "fill-dark-muted text-dark-muted"}
          />
          <span className={`text-xs text-dark-muted`}>
            {ollamaAvailable ? "Ollama connected" : "Ollama offline — using regex fallback"}
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-dark-muted">
          {ollamaAvailable
            ? "No error clusters yet — clusters form after errors are detected"
            : "Install Ollama for semantic error clustering (optional)"}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.slice(0, 10).map((cluster) => {
            const daysSinceFirst = Math.floor(
              (Date.now() - new Date(cluster.first_seen).getTime()) / (1000 * 60 * 60 * 24)
            );
            return (
              <div
                key={cluster.id}
                className="flex items-center gap-3 p-3 bg-dark-panel2 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-text truncate" title={cluster.label}>
                    {cluster.label}
                  </p>
                  <p className="text-xs text-dark-muted">
                    {cluster.id} &middot; {daysSinceFirst}d old
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="inline-block px-2 py-0.5 bg-dark-panel2 border border-dark-border text-dark-muted rounded-full text-xs font-medium">
                    {cluster.error_count} errors
                  </span>
                </div>
              </div>
            );
          })}
          {sorted.length > 10 && (
            <p className="text-xs text-dark-muted text-center pt-1">
              +{sorted.length - 10} more clusters
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-dark-muted mt-3">
        Similar errors are grouped using semantic embeddings for smarter fix matching
      </p>
    </div>
  );
}
