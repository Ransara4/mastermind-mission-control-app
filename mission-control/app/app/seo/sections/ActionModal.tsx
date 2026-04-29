"use client";

import { X, Loader2 } from "lucide-react";
import { useState } from "react";

export type ActionType =
  | "site-audit"
  | "keyword-research"
  | "content-brief"
  | "backlink-analysis"
  | "schema-markup"
  | "local-seo"
  | "technical-check";

interface Props {
  action: ActionType | null;
  actionLabel: string;
  domain: string;
  onClose: () => void;
  onRun: (params: Record<string, string>) => void;
  loading: boolean;
}

const paramConfig: Record<string, { fields: { key: string; label: string; placeholder: string; required?: boolean }[] }> = {
  "site-audit": { fields: [] },
  "keyword-research": {
    fields: [
      { key: "topic", label: "Topic / Niche (optional)", placeholder: "e.g. AI productivity tools" },
    ],
  },
  "content-brief": {
    fields: [
      { key: "keyword", label: "Target Keyword", placeholder: "e.g. best project management software", required: true },
    ],
  },
  "backlink-analysis": { fields: [] },
  "schema-markup": { fields: [] },
  "local-seo": { fields: [] },
  "technical-check": { fields: [] },
};

export default function ActionModal({ action, actionLabel, domain, onClose, onRun, loading }: Props) {
  const [params, setParams] = useState<Record<string, string>>({});

  if (!action) return null;

  const config = paramConfig[action];
  const needsInput = config.fields.length > 0;
  const canRun = !config.fields.some((f) => f.required && !params[f.key]?.trim());

  const handleRun = () => {
    if (canRun) onRun(params);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-dark-panel rounded-2xl shadow-xl shadow-black/30 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-dark-text">{actionLabel}</h3>
            <p className="text-sm text-dark-muted">{domain}</p>
          </div>
          <button onClick={onClose} className="p-1 text-dark-muted hover:text-dark-text">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {needsInput ? (
            config.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={params[field.key] || ""}
                  onChange={(e) => setParams({ ...params, [field.key]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleRun()}
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent"
                  autoFocus
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-dark-muted">
              Ready to run {actionLabel.toLowerCase()} on <strong>{domain}</strong>.
            </p>
          )}
        </div>

        <div className="px-6 py-4 bg-dark-panel2 border-t border-dark-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={!canRun || loading}
            className="px-5 py-2 text-sm font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Running..." : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
}
