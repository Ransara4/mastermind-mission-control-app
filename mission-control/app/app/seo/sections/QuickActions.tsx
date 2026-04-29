"use client";

import { Search, FileText, Link2, Code, MapPin, BarChart3, Loader2, Wrench } from "lucide-react";
import type { ActionType } from "./ActionModal";

interface Props {
  onAction: (action: ActionType) => void;
  runningAction: ActionType | null;
}

const actions: {
  id: ActionType;
  label: string;
  description: string;
  icon: any;
  color: string;
}[] = [
  {
    id: "site-audit",
    label: "Site Audit",
    description: "Full technical + on-page audit",
    icon: Search,
    color: "purple",
  },
  {
    id: "keyword-research",
    label: "Keyword Research",
    description: "Find ranking opportunities",
    icon: BarChart3,
    color: "emerald",
  },
  {
    id: "content-brief",
    label: "Content Brief",
    description: "SEO-optimized content outline",
    icon: FileText,
    color: "amber",
  },
  {
    id: "backlink-analysis",
    label: "Backlink Analysis",
    description: "Check link profile & opportunities",
    icon: Link2,
    color: "violet",
  },
  {
    id: "schema-markup",
    label: "Schema Markup",
    description: "Analyze structured data",
    icon: Code,
    color: "pink",
  },
  {
    id: "local-seo",
    label: "Local SEO",
    description: "Google Business & local optimization",
    icon: MapPin,
    color: "orange",
  },
  {
    id: "technical-check",
    label: "Technical Check",
    description: "Robots.txt, sitemap, security headers",
    icon: Wrench,
    color: "slate",
  },
];

const colorMap: Record<string, { bg: string; icon: string; hover: string; ring: string }> = {
  purple: { bg: "bg-cm-purple/10", icon: "text-cm-purple", hover: "hover:border-cm-purple", ring: "ring-cm-purple" },
  emerald: { bg: "bg-cm-purple/10", icon: "text-cm-purple", hover: "hover:border-cm-purple", ring: "ring-cm-purple" },
  amber: { bg: "bg-cm-purple/10", icon: "text-cm-purple", hover: "hover:border-cm-purple", ring: "ring-cm-purple" },
  violet: { bg: "bg-cm-purple/10", icon: "text-cm-purple", hover: "hover:border-cm-purple", ring: "ring-cm-purple" },
  pink: { bg: "bg-cm-pink/10", icon: "text-cm-pink", hover: "hover:border-cm-pink", ring: "ring-cm-pink" },
  orange: { bg: "bg-dark-panel2", icon: "text-dark-muted", hover: "hover:border-cm-purple", ring: "ring-cm-purple" },
  slate: { bg: "bg-dark-panel2", icon: "text-dark-muted", hover: "hover:border-dark-muted", ring: "ring-dark-muted" },
};

export default function QuickActions({ onAction, runningAction }: Props) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action) => {
          const c = colorMap[action.color];
          const Icon = action.icon;
          const isRunning = runningAction === action.id;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={!!runningAction}
              className={`text-left p-3 rounded-lg border border-dark-border ${c.hover} transition-all group disabled:opacity-60 disabled:cursor-not-allowed ${
                isRunning ? `ring-2 ${c.ring}` : ""
              }`}
            >
              <div className={`inline-flex p-1.5 rounded-md ${c.bg} mb-2`}>
                {isRunning ? (
                  <Loader2 size={16} className={`${c.icon} animate-spin`} />
                ) : (
                  <Icon size={16} className={c.icon} />
                )}
              </div>
              <p className="text-sm font-medium text-dark-text">{action.label}</p>
              <p className="text-xs text-dark-muted mt-0.5">{action.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
