"use client";

import type { TrackedTopic } from "@/lib/x-types";
import { Hash, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface TopicTrackerProps {
  topics: TrackedTopic[];
}

const PRIORITY_BADGES: Record<string, string> = {
  high: "bg-dark-danger/20 text-dark-danger",
  medium: "bg-dark-warn/20 text-dark-warn",
  low: "bg-dark-panel2 text-dark-muted",
};

export default function TopicTracker({ topics }: TopicTrackerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-dark-muted">
        Topics are tracked to build your curated feed. Configure topics in the agent config file.
      </p>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className={`bg-dark-panel border rounded-lg transition-colors ${
              topic.enabled ? "border-dark-border" : "border-dark-border opacity-60"
            }`}
          >
            <button
              onClick={() => setExpanded(expanded === topic.id ? null : topic.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${topic.enabled ? "bg-dark-success/100" : "bg-dark-border"}`} />
                <div>
                  <h4 className="text-sm font-semibold text-dark-text">{topic.name}</h4>
                  <p className="text-xs text-dark-muted">{topic.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGES[topic.priority]}`}>
                  {topic.priority}
                </span>
                {topic.itemCount !== undefined && (
                  <span className="text-xs text-dark-muted flex items-center gap-1">
                    <TrendingUp size={12} /> {topic.itemCount} items
                  </span>
                )}
                {expanded === topic.id ? <ChevronUp size={16} className="text-dark-muted" /> : <ChevronDown size={16} className="text-dark-muted" />}
              </div>
            </button>

            {expanded === topic.id && (
              <div className="px-4 pb-4 pt-0 border-t border-dark-border space-y-3">
                {/* Keywords */}
                <div>
                  <p className="text-xs font-medium text-dark-muted mb-1.5 flex items-center gap-1">
                    <Hash size={12} /> Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {topic.keywords.map((kw, i) => (
                      <span key={i} className="text-xs bg-cm-purple/10 text-cm-purple px-2 py-0.5 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tracked Accounts */}
                {topic.accounts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-dark-muted mb-1.5 flex items-center gap-1">
                      <Users size={12} /> Tracked Accounts
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.accounts.map((acc, i) => (
                        <span key={i} className="text-xs bg-dark-panel2 text-dark-text px-2 py-0.5 rounded-full">
                          {acc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-dark-muted">
        Edit topics: <code className="bg-dark-panel2 px-1.5 py-0.5 rounded text-dark-muted">~/.openclaw/workspace/agents/x/config/config.json</code>
      </p>
    </div>
  );
}
