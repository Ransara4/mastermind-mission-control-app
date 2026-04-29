"use client";

import {
  Bot,
  Cpu,
  Globe,
  Terminal,
  Zap,
  Shield,
  Database,
  MessageSquare,
  Calendar,
  Mail,
  Image,
  FileText,
  BarChart2,
  Clock,
  Server,
  Brain,
  Workflow,
  ExternalLink,
} from "lucide-react";

/* ── Owner config — change this when giving the system to someone new ── */
const OWNER_NAME = "Host";
const OWNER_SUBTITLE = `YOUR PERSONAL AI ASSISTANT SYSTEM`;

const AGENTS = [
  { name: "Gateway", desc: "Multi-channel router — Telegram, WhatsApp, web", port: 47293 },
  { name: "Juno Bot", desc: "Telegram assistant for clients", port: null },
  { name: "Paperclip", desc: "Autonomous background task executor", port: null },
  { name: "Guard Dog", desc: "Nightly CVE scanner and security monitor", port: null },
  { name: "Mentorship Watcher", desc: "Session monitor and follow-up tracker", port: null },
  { name: "SEO Autopilot", desc: "Keyword ranking and content pipeline", port: null },
  { name: "Zoom Agent", desc: "Records, renames, queues for Descript", port: null },
  { name: "Descript Agent", desc: "Auto-imports recordings for editing", port: null },
  { name: "Stripe Agent", desc: "Payment monitoring and reconciliation", port: null },
  { name: "Google Agent", desc: "Gmail send, Calendar, Drive access", port: null },
];

const CAPABILITIES = [
  {
    icon: MessageSquare,
    label: "Conversational AI",
    desc: "Talk to Uni via Telegram 24/7. Uni has memory, context, and can execute tasks autonomously.",
  },
  {
    icon: Workflow,
    label: "Autonomous Agents",
    desc: "65+ background agents run continuously — managing data, monitoring signals, and taking action without you.",
  },
  {
    icon: Mail,
    label: "Email & Calendar",
    desc: "Send email, schedule events, and read your inbox via natural language — no app switching needed.",
  },
  {
    icon: Shield,
    label: "Security Scanning",
    desc: "Nightly CVE checks across your running stack. Alerts when vulnerabilities match your dependencies.",
  },
  {
    icon: Image,
    label: "Content & Video",
    desc: "Zoom recordings auto-flow into Descript. IG video transcription, SEO content pipeline, image generation.",
  },
  {
    icon: BarChart2,
    label: "Business Dashboards",
    desc: "Live views into Stripe revenue, Airtable CRMs, Mentorships, Masterminds HQ, and Rio leads.",
  },
  {
    icon: Brain,
    label: "Memory System",
    desc: "Multi-layer memory: session notes, long-term MEMORY.md, workspace index, and daily journal files.",
  },
  {
    icon: Database,
    label: "Data & Finance",
    desc: "Mandiri export parsing, Zoho Books sync, currency tracking, and investment portfolio monitoring.",
  },
  {
    icon: FileText,
    label: "Skill Library",
    desc: "25+ built-in skills invokable from Mission Control or Telegram: research, strategy, content, code.",
  },
];

const LIMITATIONS = [
  "Cannot act autonomously without being triggered — agents run on schedules or signals, not \"whenever they feel like it\"",
  "No persistent internet browsing loop — web search happens on-demand per task",
  "No voice interface — text only (Telegram, web, Claude Code)",
  "Memory is human-readable files, not a vector DB — semantic search not yet wired in",
  "Canva autofill (programmatic design text) requires Enterprise — not currently available",
];

export default function SystemPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-cm-purple/15">
            <Cpu size={28} className="text-cm-purple" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-cm-purple mb-1">
              {OWNER_SUBTITLE}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Get Sorted</h1>
            <p className="text-dark-muted mt-1 max-w-2xl">
              Your configured services running 24/7 on your host machine,
              managing businesses, trading markets, watching inboxes, and executing autonomous tasks
              through a single AI layer.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-dark-muted bg-dark-panel2 border border-dark-border rounded-full px-3 py-1">
                <Server size={12} />
                Your host machine
              </div>
              <div className="flex items-center gap-1.5 text-xs text-dark-muted bg-dark-panel2 border border-dark-border rounded-full px-3 py-1">
                <Bot size={12} />
                65+ agents
              </div>
              <div className="flex items-center gap-1.5 text-xs text-dark-muted bg-dark-panel2 border border-dark-border rounded-full px-3 py-1">
                <Zap size={12} />
                Your configured services
              </div>
              <div className="flex items-center gap-1.5 text-xs text-dark-muted bg-dark-panel2 border border-dark-border rounded-full px-3 py-1">
                <Globe size={12} />
                Your timezone
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What It Can Do */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-base font-semibold text-dark-text mb-4 flex items-center gap-2">
          <Zap size={16} className="text-cm-purple" />
          What It Can Do
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAPABILITIES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-3 p-3 bg-dark-panel2 rounded-lg border border-dark-border"
            >
              <div className="p-1.5 rounded-lg bg-cm-purple/10 shrink-0">
                <Icon size={15} className="text-cm-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-dark-text">{label}</p>
                <p className="text-xs text-dark-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-base font-semibold text-dark-text mb-4 flex items-center gap-2">
          <Shield size={16} className="text-dark-warn" />
          What It Cannot Do (Honest Limits)
        </h2>
        <ul className="space-y-2">
          {LIMITATIONS.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-dark-muted">
              <span className="text-dark-warn mt-0.5 shrink-0">—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Active Agents */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-base font-semibold text-dark-text mb-4 flex items-center gap-2">
          <Bot size={16} className="text-cm-purple" />
          Key Agents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {AGENTS.map(({ name, desc, port }) => (
            <div
              key={name}
              className="flex items-start gap-2 p-3 bg-dark-panel2 rounded-lg border border-dark-border"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-dark-success mt-1.5 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-dark-text">{name}</p>
                  {port && (
                    <span className="text-xs text-dark-muted font-mono">:{port}</span>
                  )}
                </div>
                <p className="text-xs text-dark-muted truncate">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-dark-muted mt-3">65+ agents total — see Office Space for the full list.</p>
      </div>

      {/* Ports & Paths */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-base font-semibold text-dark-text mb-4 flex items-center gap-2">
          <Terminal size={16} className="text-cm-purple" />
          Ports &amp; Key Paths
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-dark-muted uppercase tracking-wide mb-2">Ports</p>
            <div className="space-y-1.5">
              {[
                { port: "3000", label: "Mission Control (this app)" },
                { port: "3002", label: "GoldenClaw (open-source demo)" },
                { port: "47293", label: "Get Sorted gateway" },
              ].map(({ port, label }) => (
                <a
                  key={port}
                  href={`http://localhost:${port}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs group"
                >
                  <code className="font-mono bg-dark-panel2 border border-dark-border px-1.5 py-0.5 rounded text-cm-purple group-hover:border-cm-purple/50 transition-colors">
                    :{port}
                  </code>
                  <span className="text-dark-muted group-hover:text-cm-purple transition-colors">{label}</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-dark-muted uppercase tracking-wide mb-2">Key Paths</p>
            <div className="space-y-1.5">
              {[
                { path: "~/.attache/workspace/", label: "Main workspace" },
                { path: "~/.attache/workspace/agents/", label: "All agents" },
                { path: "~/.attache/workspace/memory/", label: "Daily notes" },
                { path: "~/MEMORY.md", label: "Long-term memory" },
                { path: "~/.attache/backups/", label: "Nightly backups" },
              ].map(({ path, label }) => (
                <div key={path} className="flex items-start gap-2 text-xs">
                  <code className="font-mono bg-dark-panel2 border border-dark-border px-1.5 py-0.5 rounded text-dark-muted shrink-0">
                    {path}
                  </code>
                  <span className="text-dark-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-base font-semibold text-dark-text mb-4 flex items-center gap-2">
          <ExternalLink size={16} className="text-cm-purple" />
          Quick Links
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { port: 3000, label: "Mission Control" },
            { port: 3002, label: "GoldenClaw" },
            { port: 47293, label: "Gateway" },
          ].map(({ port, label }) => (
            <a
              key={port}
              href={`http://localhost:${port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-dark-panel2 border border-dark-border rounded-lg text-sm text-dark-text hover:border-cm-purple/50 hover:text-cm-purple transition-colors"
            >
              <code className="font-mono text-xs text-cm-purple">:{port}</code>
              <span>{label}</span>
              <ExternalLink size={12} className="text-dark-muted" />
            </a>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2 text-xs text-dark-muted">
        <Clock size={12} />
        <span>Running since your install date. This page is a static overview — live agent status is in Office Space.</span>
      </div>
    </div>
  );
}
