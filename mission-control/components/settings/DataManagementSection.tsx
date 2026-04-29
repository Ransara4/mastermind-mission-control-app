"use client";

import { Database } from "lucide-react";

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
}

interface SectionProps {
  settings: MCSettings;
  onChange: (updates: Partial<MCSettings>) => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cm-purple focus:ring-offset-2 focus:ring-offset-dark-panel ${checked ? "bg-cm-purple" : "bg-dark-panel2 border border-dark-border"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`}
      />
    </button>
  );
}

export default function DataManagementSection({
  settings,
  onChange,
}: SectionProps) {
  return (
    <section id="data">
      <h2 className="text-base font-bold text-dark-text flex items-center gap-2 mb-1">
        <Database size={16} className="text-cm-purple" />
        Data Management
      </h2>
      <p className="text-xs text-dark-muted mb-4">
        Automatic cleanup and retention policies.
      </p>

      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Auto-Archive After
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            Completed board cards are archived automatically. Set to 0 to
            disable.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={settings.autoArchiveDays}
              onChange={(e) =>
                onChange({ autoArchiveDays: parseInt(e.target.value) || 0 })
              }
              className="w-20 bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple"
            />
            <span className="text-sm text-dark-muted">
              days{" "}
              {settings.autoArchiveDays === 0 ? "(disabled)" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Auto-Delete Screenshots
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            Delete desktop screenshots older than N days.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <Toggle
            checked={settings.screenshotRetentionEnabled}
            onChange={(v) => onChange({ screenshotRetentionEnabled: v })}
          />
        </div>
      </div>

      {settings.screenshotRetentionEnabled && (
        <div className="flex items-center gap-2 pl-4 py-2 border-b border-dark-border">
          <span className="text-xs text-dark-muted">Delete after</span>
          <input
            type="number"
            min={1}
            step={1}
            value={settings.screenshotRetentionDays}
            onChange={(e) =>
              onChange({
                screenshotRetentionDays: parseInt(e.target.value) || 1,
              })
            }
            className="w-20 bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple"
          />
          <span className="text-sm text-dark-muted">days</span>
        </div>
      )}
    </section>
  );
}
