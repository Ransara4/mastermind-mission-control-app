"use client";

import { Bell } from "lucide-react";

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

export default function NotificationsSection({
  settings,
  onChange,
}: SectionProps) {
  return (
    <section id="notifications">
      <h2 className="text-base font-bold text-dark-text flex items-center gap-2 mb-1">
        <Bell size={16} className="text-cm-purple" />
        Notifications & Schedule
      </h2>
      <p className="text-xs text-dark-muted mb-4">
        Control when and how agents reach you.
      </p>

      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Quiet Hours</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Agents run but queue notifications during this window.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <Toggle
            checked={settings.quietHoursEnabled}
            onChange={(v) => onChange({ quietHoursEnabled: v })}
          />
        </div>
      </div>

      {settings.quietHoursEnabled && (
        <div className="flex items-center gap-2 pl-4 py-2 border-b border-dark-border">
          <span className="text-xs text-dark-muted">From</span>
          <input
            type="time"
            value={settings.quietHoursStart}
            onChange={(e) => onChange({ quietHoursStart: e.target.value })}
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-cm-purple"
          />
          <span className="text-xs text-dark-muted">to</span>
          <input
            type="time"
            value={settings.quietHoursEnd}
            onChange={(e) => onChange({ quietHoursEnd: e.target.value })}
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-cm-purple"
          />
        </div>
      )}
    </section>
  );
}
