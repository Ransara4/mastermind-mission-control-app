"use client";

import { useState, useEffect } from "react";
import { Network, ExternalLink, RefreshCw, Circle } from "lucide-react";

interface PortEntry {
  port: number;
  name: string;
  description: string;
  path?: string; // URL path suffix, e.g. "/app/settings"
  status: "core" | "planned" | "reserved" | "browser" | "other";
  checkable: boolean; // whether to ping it for live status
}

const PORTS: PortEntry[] = [
  // Core system
  {
    port: 3000,
    name: "Mission Control",
    description: "Main dashboard — Next.js dev server. All MC routes live here.",
    path: "/",
    status: "core",
    checkable: true,
  },
  {
    port: 3002,
    name: "GoldenClaw",
    description: "Open-source demo build of Mission Control. NOT the live system — for public sharing only.",
    path: "/",
    status: "core",
    checkable: true,
  },

  // Reserved / planned
  {
    port: 3003,
    name: "All Sorted (reserved)",
    description: "Reserved for the All Sorted (getallsorted.ai) build. Not yet running.",
    status: "reserved",
    checkable: false,
  },

  // Phase 5 extractions (planned)
  {
    port: 3010,
    name: "Stripe Dashboard",
    description: "Standalone Stripe app — revenue, coupons, payment links. Proxied from /app/stripe in MC via next.config.js rewrite.",
    path: "/stripe",
    status: "core",
    checkable: true,
  },
  {
    port: 3011,
    name: "SEO Hub",
    description: "Standalone SEO app — 33 sections, keyword tracking, audits, GSC. Proxied from /app/seo in MC via next.config.js rewrite.",
    path: "/seo",
    status: "core",
    checkable: true,
  },
  {
    port: 3012,
    name: "Masterminds Portal",
    description: "Standalone Masterminds app — 9 child pages, live SQLite databases shared with MC. Proxied from /app/cohorts via rewrite.",
    path: "/cohorts",
    status: "core",
    checkable: true,
  },
  {
    port: 3013,
    name: "Reserved",
    description: "Reserved for future standalone extraction.",
    status: "reserved",
    checkable: false,
  },

  // Other always-on services
  {
    port: 4200,
    name: "Postiz",
    description: "Social media scheduler — Instagram, LinkedIn, YouTube, Facebook, and 30+ platforms. Requires Docker.",
    path: "/",
    status: "other",
    checkable: true,
  },
  {
    port: 47293,
    name: "OpenClaw Gateway",
    description: "Multi-channel gateway — Telegram, WhatsApp, and other inbound channels. Always-on daemon.",
    status: "other",
    checkable: true,
  },
  {
    port: 37777,
    name: "claude-mem Worker",
    description: "Semantic memory layer. Running but not yet wired into Claude Code sessions.",
    status: "other",
    checkable: true,
  },

  // Browser automation ports
  {
    port: 9222,
    name: "Chrome — Headless",
    description: "Headless Chrome debug port for fully automated browser tasks.",
    status: "browser",
    checkable: true,
  },
  {
    port: 9223,
    name: "Chrome — Agent",
    description: "Default agent browser port. Used for most browser automation tasks.",
    status: "browser",
    checkable: true,
  },
  {
    port: 9224,
    name: "Chrome — Personal",
    description: "Personal Chrome profile port. Used when agent needs Joe's logged-in sessions.",
    status: "browser",
    checkable: true,
  },
];

const STATUS_STYLES = {
  core:     { label: "Core",     bg: "bg-cm-purple/10",      text: "text-cm-purple",     border: "border-cm-purple/20" },
  planned:  { label: "Planned",  bg: "bg-dark-warn/10",      text: "text-dark-warn",     border: "border-dark-warn/20" },
  reserved: { label: "Reserved", bg: "bg-dark-panel2",       text: "text-dark-muted",    border: "border-dark-border" },
  browser:  { label: "Browser",  bg: "bg-dark-success/10",   text: "text-dark-success",  border: "border-dark-success/20" },
  other:    { label: "Service",  bg: "bg-dark-panel2",       text: "text-dark-muted",    border: "border-dark-border" },
};

function PortCard({ entry, upMap, checking }: {
  entry: PortEntry;
  upMap: Record<number, boolean | null>;
  checking: boolean;
}) {
  const style = STATUS_STYLES[entry.status];
  const up = upMap[entry.port];
  const url = `http://localhost:${entry.port}${entry.path ?? ""}`;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4 flex items-start gap-4">
      {/* Port number */}
      <div className="shrink-0 w-16 text-right">
        <span className="font-mono text-lg font-bold text-cm-purple">{entry.port}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.path !== undefined ? (
            <a
              href={`http://localhost:${entry.port}${entry.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-dark-text hover:text-cm-purple transition-colors"
            >
              {entry.name}
            </a>
          ) : (
            <span className="text-sm font-semibold text-dark-text">{entry.name}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
            {style.label}
          </span>
          {entry.checkable && (
            <span className="flex items-center gap-1 text-xs">
              {checking ? (
                <Circle size={8} className="text-dark-muted animate-pulse" />
              ) : up === true ? (
                <><Circle size={8} className="fill-dark-success text-dark-success" /><span className="text-dark-success">up</span></>
              ) : up === false ? (
                <><Circle size={8} className="fill-dark-danger text-dark-danger" /><span className="text-dark-danger">down</span></>
              ) : (
                <Circle size={8} className="text-dark-muted" />
              )}
            </span>
          )}
        </div>
        <p className="text-xs text-dark-muted mt-1 leading-relaxed">{entry.description}</p>
      </div>

      {/* Link */}
      {entry.path !== undefined && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-xs text-dark-muted hover:text-cm-purple transition-colors mt-0.5"
        >
          <ExternalLink size={12} />
          <span className="font-mono">:{entry.port}</span>
        </a>
      )}
    </div>
  );
}

export default function PortReferencePage() {
  const [upMap, setUpMap] = useState<Record<number, boolean | null>>({});
  const [checking, setChecking] = useState(false);

  async function checkPorts() {
    setChecking(true);
    const checkable = PORTS.filter(p => p.checkable);
    const results = await Promise.allSettled(
      checkable.map(p =>
        fetch(`/api/port-status?port=${p.port}`)
          .then(r => r.json())
          .then(d => ({ port: p.port, up: d.up as boolean }))
          .catch(() => ({ port: p.port, up: false }))
      )
    );
    const map: Record<number, boolean> = {};
    for (const r of results) {
      if (r.status === "fulfilled") map[r.value.port] = r.value.up;
    }
    setUpMap(map);
    setChecking(false);
  }

  useEffect(() => { checkPorts(); }, []);

  const sections: { label: string; filter: PortEntry["status"][] }[] = [
    { label: "Core System",        filter: ["core"] },
    { label: "Reserved",           filter: ["reserved", "planned"] },
    { label: "Always-On Services", filter: ["other"] },
    { label: "Browser Automation", filter: ["browser"] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cm-purple/15 rounded-xl">
              <Network size={24} className="text-cm-purple" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-dark-text">Port Reference</h2>
              <p className="text-sm text-dark-muted mt-1">
                All services, ports, and routing for OpenClaw. Click any port link to open in a new tab.
              </p>
            </div>
          </div>
          <button
            onClick={checkPorts}
            disabled={checking}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-muted bg-dark-panel2 border border-dark-border rounded-lg hover:text-dark-text hover:border-cm-purple transition-colors"
          >
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
            {checking ? "Checking..." : "Refresh Status"}
          </button>
        </div>
      </div>

      {/* Sections */}
      {sections.map(section => {
        const entries = PORTS.filter(p => section.filter.includes(p.status));
        return (
          <div key={section.label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-dark-muted px-1">
              {section.label}
            </p>
            {entries.map(entry => (
              <PortCard key={entry.port} entry={entry} upMap={upMap} checking={checking} />
            ))}
          </div>
        );
      })}

      {/* Routing note */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <p className="text-sm font-semibold text-dark-text mb-2">How Phase 5 routing works</p>
        <p className="text-xs text-dark-muted leading-relaxed">
          When a service is extracted to its own port, MC adds a <code className="font-mono bg-dark-panel2 px-1 rounded">rewrite</code> in{" "}
          <code className="font-mono bg-dark-panel2 px-1 rounded">next.config.js</code> so the original MC URL continues to work.
          Agents and browsers always hit the same path on port 3000 — the rewrite proxies silently to the standalone app.
          No agent config changes needed.
        </p>
        <div className="mt-3 font-mono text-xs bg-dark-panel2 border border-dark-border rounded-lg p-3 text-dark-muted leading-relaxed">
          <span className="text-dark-muted">{"/app/stripe"}</span>
          <span className="text-cm-purple mx-2">→</span>
          <span className="text-dark-success">localhost:3010</span>
          <span className="text-dark-muted ml-4 text-xs">(transparent to agents)</span>
        </div>
      </div>

      <div className="pb-8" />
    </div>
  );
}
