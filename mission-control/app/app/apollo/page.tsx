"use client";

import { useState, useEffect } from "react";
import {
  Rocket,
  Settings,
  Users,
  Building2,
  UserSearch,
  Download,
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
    title: "People Search",
    description: "Search for people by keywords, job title, company, location, and more.",
    command: 'node src/index.js search-people --query "CTO fintech" --limit 20',
    icon: Users,
  },
  {
    title: "Company Search",
    description: "Find companies by name, industry, size, and other criteria.",
    command: 'node src/index.js search-companies --query "Shopify" --limit 10',
    icon: Building2,
  },
  {
    title: "Contact Enrichment",
    description: "Enrich a contact by email to get full profile data, social links, and company info.",
    command: "node src/index.js enrich-person --email someone@example.com",
    icon: UserSearch,
  },
  {
    title: "Lead Export",
    description: "Export search results to a JSON file for downstream processing.",
    command: 'node src/index.js export --type people --query "AI founders" --output ./leads.json',
    icon: Download,
  },
];

export default function ApolloPage() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [expandedCap, setExpandedCap] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/apollo/status")
      .then((res) => res.json())
      .then((data) => setAgentStatus(data))
      .catch(() => setAgentStatus({ status: "error", lastMessage: "Could not fetch status" }))
      .finally(() => setStatusLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <ApiKeyBanner slug="apollo" />

      {/* Hero */}
      <div className="bg-dark-panel rounded-xl shadow-md shadow-black/20 border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-cm-purple to-cm-purple/60 rounded-xl flex items-center justify-center">
            <Rocket size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Apollo.io</h1>
            <p className="text-sm text-dark-muted">
              B2B lead intelligence -- search people, enrich contacts, research companies.
            </p>
          </div>
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
              <span className="font-mono font-dm-mono text-xs bg-dark-panel2 px-1.5 py-0.5 rounded">APOLLO_API_KEY</span>
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
            const Icon = cap.icon;
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
