"use client";

import { Lightbulb, ExternalLink, CheckCircle2 } from "lucide-react";
import type { ScroogeDashboard } from "@/lib/scrooge-types";

interface Props {
  research: ScroogeDashboard["research"];
}

const confidenceColor: Record<string, string> = {
  high: "bg-dark-success/20 text-dark-success",
  medium: "bg-dark-warn/20 text-dark-warn",
  low: "bg-dark-panel2 text-dark-muted",
};

export default function ResearchSuggestions({ research }: Props) {
  if (!research.suggestions || research.suggestions.length === 0) {
    return null;
  }

  const pending = research.suggestions.filter((s) => !s.installed);
  const installed = research.suggestions.filter((s) => s.installed);

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-amber-500" size={20} />
          <h2 className="text-lg font-bold  text-dark-text">
            Efficiency Suggestions
          </h2>
        </div>
        {research.lastUpdate && (
          <span className="text-xs text-dark-muted">
            Researched{" "}
            {new Date(research.lastUpdate).toLocaleDateString()}
          </span>
        )}
      </div>

      {pending.length > 0 && (
        <div className="space-y-3 mb-4">
          {pending.map((s) => (
            <div
              key={s.name}
              className="flex items-start gap-3 p-3 rounded-lg bg-dark-warn/10 border border-dark-warn/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-dark-text">
                    {s.name}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      confidenceColor[s.confidence] || confidenceColor.low
                    }`}
                  >
                    {s.confidence}
                  </span>
                </div>
                <p className="text-xs text-dark-muted">{s.implementation}</p>
                {s.sources.length > 0 && (
                  <a
                    href={s.sources[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cm-purple hover:text-cm-purple mt-1"
                  >
                    Source <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {installed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-dark-muted uppercase tracking-wider">
            Applied
          </p>
          {installed.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 text-sm text-dark-muted"
            >
              <CheckCircle2 size={14} className="text-dark-success" />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
