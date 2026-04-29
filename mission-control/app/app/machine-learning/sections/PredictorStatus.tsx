"use client";

import { Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import type { PredictorStats } from "@/lib/ml-types";

export default function PredictorStatus({
  predictor,
}: {
  predictor: PredictorStats | undefined;
}) {
  if (!predictor) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Success Predictor</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-dark-muted">
          Predictor not initialized
        </div>
      </div>
    );
  }

  const progress = Math.min(100, (predictor.sample_count / predictor.min_required) * 100);
  const remaining = Math.max(0, predictor.min_required - predictor.sample_count);

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Success Predictor</h3>
        </div>
        {predictor.ready ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-dark-success/10 text-dark-success">
            <CheckCircle2 size={12} />
            Active
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted">
            <AlertCircle size={12} />
            Warming Up
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Training progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-dark-muted">Training Data</span>
            <span className="text-sm font-medium text-dark-text">
              {predictor.sample_count} / {predictor.min_required} samples
            </span>
          </div>
          <div className="h-3 bg-dark-panel2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${predictor.ready ? "bg-cm-purple" : "bg-cm-purple"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {!predictor.ready && (
            <p className="text-xs text-dark-muted mt-1">
              {remaining} more resolved feedback entries needed to activate
            </p>
          )}
        </div>

        {/* Model details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-panel2 rounded-lg p-3">
            <p className="text-xs text-dark-muted">Algorithm</p>
            <p className="text-sm font-medium text-dark-text">k-NN (k=5)</p>
          </div>
          <div className="bg-dark-panel2 rounded-lg p-3">
            <p className="text-xs text-dark-muted">Last Trained</p>
            <p className="text-sm font-medium text-dark-text">
              {predictor.trained_at
                ? new Date(predictor.trained_at).toLocaleDateString()
                : "Never"}
            </p>
          </div>
        </div>

        <p className="text-xs text-dark-muted">
          {predictor.ready
            ? "Predicting which genes will fix errors based on past outcomes"
            : "Collecting feedback data — predictor activates after 20 resolved entries"}
        </p>
      </div>
    </div>
  );
}
