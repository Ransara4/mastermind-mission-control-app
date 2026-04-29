"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Globe,
  Shield,
  FileText,
  Terminal,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface StatusData {
  agentId: string;
  status: string;
  lastRun: string;
  lastResult: string;
  lastMessage: string;
  errorCount: number;
  enabled: boolean;
}

interface Domain {
  domain: string;
  expireDate?: string;
  expire_date?: string;
  autoRenew?: number;
  status?: string;
}

const CAPABILITIES = [
  {
    title: "Check Domain Availability",
    command: "check mastermindshq.business",
    description:
      "Checks if a domain is available for registration, shows pricing for registration and renewal.",
  },
  {
    title: "Register Domains",
    command: "register coolstartup.com --years 2",
    description:
      "Registers a new domain for the specified number of years (defaults to 1).",
  },
  {
    title: "List All Domains",
    command: "list",
    description:
      "Shows all domains in the account with expiration dates and auto-renew status.",
  },
  {
    title: "List DNS Records",
    command: "dns-list mastermindshq.business",
    description:
      "Shows all DNS records (A, CNAME, MX, TXT, etc.) for a domain with record IDs.",
  },
  {
    title: "Create DNS Records",
    command: 'dns-create example.com --type CNAME --name www --content example.com',
    description:
      "Creates a new DNS record. Supports A, AAAA, CNAME, MX, TXT, SRV, TLSA, NS, and CAA types.",
  },
  {
    title: "Edit DNS Records",
    command: 'dns-edit example.com 12345 --type A --content 1.2.3.4',
    description: "Edits an existing DNS record by its ID.",
  },
  {
    title: "Delete DNS Records",
    command: "dns-delete example.com 12345",
    description: "Deletes a DNS record by its ID.",
  },
  {
    title: "TLD Pricing",
    command: "pricing",
    description:
      "Shows registration and renewal prices for popular TLDs (.com, .net, .io, .dev, .ai, etc.).",
  },
  {
    title: "SSL Certificate Bundle",
    command: "ssl mastermindshq.business",
    description:
      "Retrieves the full SSL certificate chain and private key for a domain.",
  },
  {
    title: "Get Nameservers",
    command: "ns mastermindshq.business",
    description: "Shows the current nameservers for a domain.",
  },
  {
    title: "Update Nameservers",
    command: "ns-update example.com --ns ns1.cloudflare.com,ns2.cloudflare.com",
    description: "Updates nameservers for a domain (e.g., switching to Cloudflare).",
  },
  {
    title: "URL Forwarding Rules",
    command: "forwarding example.com",
    description: "Lists all URL forwarding rules configured for a domain.",
  },
  {
    title: "Add URL Forward",
    command: "forward-add example.com --location https://newsite.com --type permanent",
    description:
      "Creates a URL forward (temporary or permanent redirect) for a domain or subdomain.",
  },
  {
    title: "Delete URL Forward",
    command: "forward-delete example.com 12345",
    description: "Removes a URL forwarding rule by its ID.",
  },
  {
    title: "Ping / Connection Test",
    command: "ping",
    description: "Tests the API connection and shows your public IP address.",
  },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const statusColor: Record<string, string> = {
  idle: "bg-green-500",
  working: "bg-cm-purple",
  error: "bg-dark-danger",
  disabled: "bg-dark-muted",
};

const resultBadge: Record<string, { bg: string; text: string }> = {
  success: { bg: "bg-dark-success/10 border-dark-success/30 text-dark-success", text: "Success" },
  partial: { bg: "bg-dark-warn/10 border-dark-warn/30 text-dark-warn", text: "Partial" },
  error: { bg: "bg-dark-danger/10 border-dark-danger/30 text-dark-danger", text: "Error" },
  skipped: { bg: "bg-dark-panel2 border-dark-border text-dark-muted", text: "Skipped" },
};

export default function PorkbunPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/porkbun?action=status");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus(data);
      setEnabled(data.enabled !== false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDomains = useCallback(async () => {
    setDomainsLoading(true);
    try {
      const res = await fetch("/api/porkbun?action=list");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDomains(data.domains || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setDomainsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/porkbun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", enabled: !enabled }),
      });
      if (res.ok) {
        setEnabled(!enabled);
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Porkbun agent...</p>
      </div>
    );
  }

  const badge = resultBadge[status?.lastResult || ""] || resultBadge.skipped;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ApiKeyBanner slug="porkbun" />

      {/* 1. Hero / Overview */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <Image
            src="/icons/porkbun.png"
            alt="Porkbun"
            width={48}
            height={48}
            className="rounded-lg"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">
              Porkbun Domain Manager
            </h1>
            <p className="text-dark-muted mt-1">
              Manage domain registration, DNS records, SSL certificates,
              nameservers, and URL forwarding via the Porkbun API.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                statusColor[status?.status || "idle"]
              }`}
            />
            <span className="text-sm text-dark-muted capitalize">
              {status?.status || "idle"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Settings Panel */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">Settings</span>
          </div>
          {settingsOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {settingsOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-dark-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-text">
                  Agent Enabled
                </p>
                <p className="text-xs text-dark-muted">
                  Master on/off switch for the Porkbun agent
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? "bg-cm-purple" : "bg-dark-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-dark-text">Schedule</p>
              <p className="text-xs text-dark-muted">
                No cron schedule -- this agent is invoked manually via CLI or
                other agents
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-dark-text mb-1">
                CLI Path
              </p>
              <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-text font-dm-mono">
                node ~/.openclaw/workspace/agents/porkbun/src/index.js
              </code>
            </div>
          </div>
        )}
      </div>

      {/* 3. Capabilities */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setCapabilitiesOpen(!capabilitiesOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">
              What It Can Do
            </span>
            <span className="text-xs text-dark-muted">
              {CAPABILITIES.length} commands
            </span>
          </div>
          {capabilitiesOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {capabilitiesOpen && (
          <div className="px-5 pb-5 space-y-3 border-t border-dark-border pt-4">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="p-4 bg-dark-warn/10 rounded-lg border border-dark-warn/30"
              >
                <h4 className="font-medium text-dark-warn">{cap.title}</h4>
                <p className="text-sm text-dark-muted mt-1">
                  {cap.description}
                </p>
                <code className="text-xs bg-dark-panel2 px-2 py-1 rounded mt-2 inline-block text-dark-warn font-mono font-dm-mono">
                  {cap.command}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Status / Activity */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold tracking-tight text-dark-text flex items-center gap-2">
            <RefreshCw size={18} className="text-dark-muted" />
            Status &amp; Activity
          </h3>
          <button
            onClick={loadStatus}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors"
            title="Refresh status"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {status ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-dark-panel2 rounded-lg">
                <p className="text-xs text-dark-muted mb-1">Last Run</p>
                <p className="text-sm font-medium text-dark-text">
                  {status.lastRun ? formatDate(status.lastRun) : "Never"}
                </p>
              </div>
              <div className="p-3 bg-dark-panel2 rounded-lg">
                <p className="text-xs text-dark-muted mb-1">Last Result</p>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${badge.bg}`}
                >
                  {status.lastResult === "success" ? (
                    <CheckCircle2 size={11} />
                  ) : status.lastResult === "error" ? (
                    <XCircle size={11} />
                  ) : (
                    <AlertCircle size={11} />
                  )}
                  {badge.text}
                </span>
              </div>
              <div className="p-3 bg-dark-panel2 rounded-lg">
                <p className="text-xs text-dark-muted mb-1">Error Count</p>
                <p className="text-sm font-medium text-dark-text">
                  {status.errorCount}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-dark-panel2 rounded-lg">
              <Clock size={16} className="text-dark-muted shrink-0" />
              <span className="text-sm text-dark-muted">
                {status.lastMessage || "No recent activity"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-dark-panel2 rounded-lg">
            <Clock size={16} className="text-dark-muted" />
            <span className="text-sm text-dark-muted">
              Agent created, awaiting first run.
            </span>
          </div>
        )}
      </div>

      {/* 5. Domains (live data) */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => {
            setDomainsOpen(!domainsOpen);
            if (!domainsOpen && domains.length === 0) loadDomains();
          }}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">
              Managed Domains
            </span>
            {domains.length > 0 && (
              <span className="text-xs text-dark-muted">
                {domains.length} domain{domains.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {domainsOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {domainsOpen && (
          <div className="px-5 pb-5 border-t border-dark-border pt-4">
            {domainsLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 size={16} className="animate-spin text-cm-purple" />
                <span className="text-sm text-dark-muted">
                  Loading domains...
                </span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 py-4 text-dark-danger">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            ) : domains.length === 0 ? (
              <p className="text-sm text-dark-muted py-4 text-center">
                No domains loaded. Click refresh to fetch from Porkbun API.
              </p>
            ) : (
              <div className="divide-y divide-dark-border">
                {domains.map((d) => (
                  <div
                    key={d.domain}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-dark-muted" />
                      <span className="font-medium text-dark-text text-sm">
                        {d.domain}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-dark-muted">
                      <span>
                        Expires{" "}
                        {d.expireDate || d.expire_date || "unknown"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          d.autoRenew === 1
                            ? "bg-dark-success/10 text-dark-success"
                            : "bg-dark-panel2 text-dark-muted"
                        }`}
                      >
                        {d.autoRenew === 1 ? "Auto-renew" : "Manual"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={loadDomains}
              disabled={domainsLoading}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs text-cm-purple hover:bg-cm-purple/10 rounded-lg transition-colors"
            >
              <RefreshCw
                size={12}
                className={domainsLoading ? "animate-spin" : ""}
              />
              Refresh from API
            </button>
          </div>
        )}
      </div>

      {/* 6. Documentation */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setDocsOpen(!docsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">Documentation</span>
          </div>
          {docsOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {docsOpen && (
          <div className="px-5 pb-5 border-t border-dark-border pt-4 space-y-4">
            <div>
              <h4 className="font-medium text-dark-text mb-2">Overview</h4>
              <p className="text-sm text-dark-muted">
                The Porkbun agent wraps the Porkbun API v3 to provide
                full domain lifecycle management. It supports domain
                registration, DNS record CRUD, SSL certificate retrieval,
                nameserver management, and URL forwarding configuration.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-dark-text mb-2">
                CLI Reference
              </h4>
              <div className="bg-dark-bg text-dark-text rounded-lg p-4 text-sm font-mono font-dm-mono space-y-1 overflow-x-auto">
                <p className="text-dark-muted"># Test connection</p>
                <p>node src/index.js ping</p>
                <p className="text-dark-muted mt-2"># Domain operations</p>
                <p>node src/index.js check &lt;domain&gt;</p>
                <p>
                  node src/index.js register &lt;domain&gt; [--years &lt;n&gt;]
                </p>
                <p>node src/index.js list</p>
                <p className="text-dark-muted mt-2"># DNS management</p>
                <p>node src/index.js dns-list &lt;domain&gt;</p>
                <p>
                  node src/index.js dns-create &lt;domain&gt; --type &lt;T&gt;
                  --content &lt;V&gt; [--name &lt;sub&gt;]
                </p>
                <p>
                  node src/index.js dns-edit &lt;domain&gt; &lt;id&gt; --type
                  &lt;T&gt; --content &lt;V&gt;
                </p>
                <p>
                  node src/index.js dns-delete &lt;domain&gt; &lt;id&gt;
                </p>
                <p className="text-dark-muted mt-2"># SSL &amp; Nameservers</p>
                <p>node src/index.js ssl &lt;domain&gt;</p>
                <p>node src/index.js ns &lt;domain&gt;</p>
                <p>
                  node src/index.js ns-update &lt;domain&gt; --ns
                  &lt;ns1,ns2&gt;
                </p>
                <p className="text-dark-muted mt-2"># URL Forwarding</p>
                <p>node src/index.js forwarding &lt;domain&gt;</p>
                <p>
                  node src/index.js forward-add &lt;domain&gt; --location
                  &lt;url&gt;
                </p>
                <p>
                  node src/index.js forward-delete &lt;domain&gt; &lt;id&gt;
                </p>
                <p className="text-dark-muted mt-2"># Pricing</p>
                <p>node src/index.js pricing [--all]</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-dark-text mb-2">
                Environment Variables
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-dark-muted" />
                  <code className="text-xs bg-dark-panel2 px-2 py-1 rounded font-mono font-dm-mono text-dark-text">
                    PORKBUN_API_KEY
                  </code>
                  <span className="text-xs text-dark-muted">
                    API key from porkbun.com/account/api
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-dark-muted" />
                  <code className="text-xs bg-dark-panel2 px-2 py-1 rounded font-mono font-dm-mono text-dark-text">
                    PORKBUN_SECRET_KEY
                  </code>
                  <span className="text-xs text-dark-muted">
                    Secret API key from porkbun.com/account/api
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-dark-text mb-2">
                External Resources
              </h4>
              <a
                href="https://porkbun.com/api/json/v3/documentation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cm-purple hover:text-cm-purple-mid"
              >
                Porkbun API v3 Documentation
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
