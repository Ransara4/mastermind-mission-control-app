"use client";

import { useState, useEffect } from "react";
import {
  Triangle,
  Settings,
  Rocket,
  FolderOpen,
  Eye,
  ScrollText,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface AgentStatus {
  agentId?: string;
  status?: string;
  lastRun?: string | null;
  lastResult?: string | null;
  lastMessage?: string | null;
  errorCount?: number;
  enabled?: boolean;
}

const CAPABILITIES = [
  {
    title: "Deploy a directory",
    description: "Deploy any local project directory to Vercel with a single command.",
    command: "node src/index.js deploy ./path/to/project",
  },
  {
    title: "List projects",
    description: "View all Vercel projects linked to your account with framework and update info.",
    command: "node src/index.js list",
  },
  {
    title: "View deployments",
    description: "List recent deployments, optionally filtered by project name.",
    command: "node src/index.js deployments --project my-app",
  },
  {
    title: "Check deployment logs",
    description: "Fetch build and runtime logs for any deployment by ID.",
    command: "node src/index.js logs dpl_xxxx",
  },
  {
    title: "Manage domains",
    description: "List all domains on your account, or domains for a specific project.",
    command: "node src/index.js domains --project my-app",
  },
];

export default function VercelPage() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [expandedCap, setExpandedCap] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/vercel/status")
      .then((res) => res.json())
      .then((data) => setAgentStatus(data))
      .catch(() => setAgentStatus({ status: "error", lastMessage: "Could not fetch status" }))
      .finally(() => setStatusLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <ApiKeyBanner slug="vercel" />

      {/* Hero */}
      <div className="bg-dark-panel rounded-xl shadow-md shadow-black/20 border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-dark-text rounded-xl flex items-center justify-center">
            <Triangle size={28} className="text-dark-bg" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Vercel</h1>
            <p className="text-sm text-dark-muted">
              Deployment management — deploy projects, monitor builds, manage domains.
            </p>
          </div>
        </div>

        <div className="mt-5 bg-dark-panel2 border border-cm-purple/15 rounded-lg p-4">
          <p className="text-sm text-dark-text font-medium mb-1">Recommended for web hosting</p>
          <p className="text-xs text-dark-muted leading-relaxed">
            Vercel is a free, easy to use platform for hosting websites and web apps.
            Connect a GitHub repo or deploy a local directory and your site is live in seconds
            with automatic HTTPS, global CDN, and preview deployments on every push.
            The free Hobby tier covers most personal and small projects with no credit card required.
          </p>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-dark-panel rounded-xl shadow-md shadow-black/20 border border-dark-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-dark-muted" />
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">Configuration</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-muted">
              <span className="font-mono font-dm-mono text-xs bg-dark-panel2 px-1.5 py-0.5 rounded">VERCEL_TOKEN</span>
              {" "}is required for all operations.
            </p>
          </div>
          <a
            href="/app/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cm-purple bg-cm-purple/10 border border-cm-purple/20 rounded-lg hover:bg-cm-purple/20 transition-colors"
          >
            <ExternalLink size={12} />
            Manage in Settings
          </a>
        </div>
      </div>

      {/* Capabilities */}
      <div className="bg-dark-panel rounded-xl shadow-md shadow-black/20 border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Capabilities</h2>
        <div className="space-y-2">
          {CAPABILITIES.map((cap, idx) => {
            const isOpen = expandedCap === idx;
            const icons = [Rocket, FolderOpen, Eye, ScrollText, Globe];
            const Icon = icons[idx];
            return (
              <div
                key={idx}
                className="border border-dark-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCap(isOpen ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark-panel2 transition-colors"
                >
                  <Icon size={16} className="text-dark-muted shrink-0" />
                  <span className="flex-1 text-sm font-medium text-dark-text">
                    {cap.title}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={14} className="text-dark-muted" />
                  ) : (
                    <ChevronDown size={14} className="text-dark-muted" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 border-t border-dark-border">
                    <p className="text-sm text-dark-muted mt-2">{cap.description}</p>
                    <code className="block mt-2 px-3 py-2 bg-dark-bg text-dark-success text-xs rounded-lg font-mono font-dm-mono">
                      $ {cap.command}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status / Activity */}
      <div className="bg-dark-panel rounded-xl shadow-md shadow-black/20 border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Agent Status</h2>
        {statusLoading ? (
          <div className="flex items-center gap-2 text-dark-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading status...</span>
          </div>
        ) : agentStatus ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-muted w-24">Status:</span>
              <span className="inline-flex items-center gap-1.5 text-sm">
                {agentStatus.lastResult === "success" ? (
                  <CheckCircle2 size={14} className="text-dark-success" />
                ) : agentStatus.lastResult === "error" ? (
                  <AlertCircle size={14} className="text-dark-danger" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-dark-muted" />
                )}
                <span className="capitalize text-dark-text">{agentStatus.status || "unknown"}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-muted w-24">Last run:</span>
              <span className="text-sm text-dark-text">
                {agentStatus.lastRun
                  ? new Date(agentStatus.lastRun).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-muted w-24">Last result:</span>
              <span
                className={`text-sm ${
                  agentStatus.lastResult === "success"
                    ? "text-dark-success"
                    : agentStatus.lastResult === "error"
                    ? "text-dark-danger"
                    : "text-dark-muted"
                }`}
              >
                {agentStatus.lastResult || "n/a"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-muted w-24">Message:</span>
              <span className="text-sm text-dark-text">
                {agentStatus.lastMessage || "No message"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-dark-muted">No status data available.</p>
        )}
      </div>
    </div>
  );
}
