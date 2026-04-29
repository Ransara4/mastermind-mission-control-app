"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Cpu, Gauge, Check, AlertCircle } from "lucide-react";

interface MCSettings {
  theme: "dark" | "light";
  appName: string;
  logoPath: string;
  displayDensity: "compact" | "comfortable";
  agentExecutionMode: "active" | "paused" | "dry-run";
  llmCostTier: "conservative" | "balanced" | "aggressive";
  dailyBudgetCap: number;
  startupPage: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  autoArchiveDays: number;
  screenshotRetentionEnabled: boolean;
  screenshotRetentionDays: number;
  dateFormat: "MMM DD, YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  currencyPrimary: string;
  currencySecondary: string;
  currencyExchangeRate: number;
  rowsPerPage: number;
  refreshInterval: number;
  whatsappSignature: string;
  confirmDestructive: boolean;
  defaultBoardColumn: string;
  keyboardShortcutsEnabled: boolean;
  // System Controls
  timezone: string;
  agentBrowserPort: 9222 | 9223 | 9224;

  // Performance
  nodeMemoryCap: number;
}

interface SectionProps {
  settings: MCSettings;
  onChange: (updates: Partial<MCSettings>) => void;
  logoUploading?: boolean;
  onLogoUpload?: (file: File) => void;
}

const EXECUTION_MODES = [
  { value: "active" as const, label: "Active", colorClass: "text-dark-success" },
  { value: "paused" as const, label: "Paused", colorClass: "text-dark-warn" },
  { value: "dry-run" as const, label: "Dry-run", colorClass: "text-cm-purple" },
];

const STARTUP_PAGES = [
  { value: "/app/tasks", label: "Board" },
  { value: "/app/daily-summary", label: "Daily Summary" },
  { value: "/app/calendar", label: "Calendar" },
  { value: "/app/office", label: "Office Space" },
  { value: "/app/memory", label: "System" },
];

// Memory cap presets in MB
const MEMORY_PRESETS = [256, 384, 450, 512, 768, 1024];

export default function SystemControlsSection({
  settings,
  onChange,
}: SectionProps) {
  const [capApplyStatus, setCapApplyStatus] = useState<"idle" | "applying" | "applied" | "error">("idle");
  const [liveCapMB, setLiveCapMB] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/mc-settings/memory-cap")
      .then(r => r.json())
      .then(d => { if (d.cap) setLiveCapMB(d.cap); })
      .catch(() => {});
  }, []);

  const handleApplyCap = useCallback(async () => {
    setCapApplyStatus("applying");
    try {
      const res = await fetch("/api/mc-settings/memory-cap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cap: settings.nodeMemoryCap }),
      });
      if (!res.ok) throw new Error("Failed");
      setCapApplyStatus("applied");
      setTimeout(() => setCapApplyStatus("idle"), 4000);
    } catch {
      setCapApplyStatus("error");
      setTimeout(() => setCapApplyStatus("idle"), 4000);
    }
  }, [settings.nodeMemoryCap]);

  const FALLBACK_TIMEZONES = [
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Anchorage','Pacific/Honolulu','Europe/London','Europe/Paris',
    'Europe/Berlin','Europe/Moscow','Asia/Dubai','Asia/Kolkata','Asia/Dhaka',
    'Asia/Bangkok','Asia/Singapore','Asia/Makassar','Asia/Tokyo','Asia/Seoul',
    'Australia/Sydney','Pacific/Auckland',
  ];

  const currentMode = EXECUTION_MODES.find(
    (m) => m.value === settings.agentExecutionMode
  );

  return (
    <section id="system">
      <h2 className="text-base font-bold text-dark-text flex items-center gap-2 mb-1">
        <Cpu size={16} className="text-cm-purple" />
        System Controls
      </h2>
      <p className="text-xs text-dark-muted mb-4">
        Agent behavior, cost controls, and startup preferences.
      </p>

      {/* Agent Execution Mode */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Agent Execution Mode
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            Controls whether agents can take real actions.
            {currentMode && (
              <span
                className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs ${
                  currentMode.value === "active"
                    ? "bg-dark-success/15 text-dark-success"
                    : currentMode.value === "paused"
                    ? "bg-dark-warn/15 text-dark-warn"
                    : "bg-cm-purple/15 text-cm-purple"
                }`}
              >
                {currentMode.label}
              </span>
            )}
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="flex rounded-lg border border-dark-border overflow-hidden">
            {EXECUTION_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() =>
                  onChange({ agentExecutionMode: mode.value })
                }
                className={`px-3 py-1.5 text-sm transition-colors ${
                  settings.agentExecutionMode === mode.value
                    ? "bg-cm-purple text-white"
                    : "bg-dark-panel2 text-dark-muted hover:text-dark-text"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LLM Cost Tier */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">LLM Cost Tier</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Controls which models agents prefer for tasks.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <select
            value={settings.llmCostTier}
            onChange={(e) =>
              onChange({
                llmCostTier: e.target.value as MCSettings["llmCostTier"],
              })
            }
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple"
          >
            <option value="conservative">Conservative (max Haiku)</option>
            <option value="balanced">Balanced (mixed)</option>
            <option value="aggressive">Aggressive (more Opus)</option>
          </select>
        </div>
      </div>

      {/* Daily Budget Cap */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Daily Budget Cap (USD)
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            Maximum daily LLM spend. Set to 0 for no limit.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-dark-muted text-sm">$</span>
            <input
              type="number"
              min={0}
              step={1}
              value={settings.dailyBudgetCap || ""}
              placeholder="No limit"
              onChange={(e) =>
                onChange({
                  dailyBudgetCap: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple w-32"
            />
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Timezone</p>
          <p className="text-xs text-dark-muted mt-0.5">Used for all dates, calendar events, and cron schedules.</p>
        </div>
        <div className="ml-4 shrink-0">
          <select
            value={settings.timezone}
            onChange={e => onChange({ timezone: e.target.value })}
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple max-w-[220px]"
          >
            {(typeof Intl !== 'undefined' && Intl.supportedValuesOf
              ? Intl.supportedValuesOf('timeZone')
              : FALLBACK_TIMEZONES
            ).map((tz: string) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Startup Page */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Startup Page</p>
          <p className="text-xs text-dark-muted mt-0.5">
            The page that loads when you open Mission Control.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <select
            value={settings.startupPage}
            onChange={(e) => onChange({ startupPage: e.target.value })}
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple"
          >
            {STARTUP_PAGES.map((page) => (
              <option key={page.value} value={page.value}>
                {page.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Agent Browser Port */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Agent Browser Port</p>
          <p className="text-xs text-dark-muted mt-0.5">Default Chrome port for browser automation tasks.</p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="flex rounded-lg border border-dark-border overflow-hidden">
            {([9222, 9223, 9224] as const).map(port => (
              <button
                key={port}
                onClick={() => onChange({ agentBrowserPort: port })}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  settings.agentBrowserPort === port
                    ? 'bg-cm-purple text-white'
                    : 'bg-dark-panel2 text-dark-muted hover:text-dark-text'
                }`}
              >
                {port === 9222 ? 'Headless' : port === 9223 ? 'Agent' : 'Personal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Node Memory Cap */}
      <div className="py-3 border-b border-dark-border last:border-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-dark-text flex items-center gap-1.5">
              <Gauge size={13} className="text-cm-purple" />
              Node Memory Cap
            </p>
            <p className="text-xs text-dark-muted mt-0.5">
              Max RAM for the MC server process (<code className="font-mono">--max-old-space-size</code>).
              {liveCapMB && (
                <span className="ml-1.5 text-dark-success">Live: {liveCapMB} MB</span>
              )}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-sm font-mono text-cm-purple w-16 text-right">
              {settings.nodeMemoryCap} MB
            </span>
            <button
              onClick={handleApplyCap}
              disabled={capApplyStatus === "applying"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                capApplyStatus === "applied"
                  ? "bg-dark-success/15 text-dark-success border border-dark-success/30"
                  : capApplyStatus === "error"
                  ? "bg-dark-danger/15 text-dark-danger border border-dark-danger/30"
                  : "bg-cm-purple/15 text-cm-purple border border-cm-purple/30 hover:bg-cm-purple/25"
              }`}
            >
              {capApplyStatus === "applied" ? (
                <><Check size={11} /> Applied</>
              ) : capApplyStatus === "error" ? (
                <><AlertCircle size={11} /> Error</>
              ) : capApplyStatus === "applying" ? (
                "Saving..."
              ) : (
                "Apply to plist"
              )}
            </button>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {MEMORY_PRESETS.map(mb => (
            <button
              key={mb}
              onClick={() => onChange({ nodeMemoryCap: mb })}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                settings.nodeMemoryCap === mb
                  ? "bg-cm-purple text-white"
                  : "bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
              }`}
            >
              {mb} MB
            </button>
          ))}
          <input
            type="number"
            min={128}
            max={8192}
            step={64}
            value={settings.nodeMemoryCap}
            onChange={e => onChange({ nodeMemoryCap: Math.max(128, Math.min(8192, Number(e.target.value))) })}
            className="w-24 bg-dark-panel2 border border-dark-border text-dark-text rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-cm-purple"
            placeholder="Custom"
          />
        </div>

        {capApplyStatus === "applied" && (
          <p className="text-xs text-dark-warn mt-2 flex items-center gap-1">
            <AlertCircle size={11} />
            Plist updated. Restart MC to apply the new cap.
          </p>
        )}
      </div>
    </section>
  );
}
