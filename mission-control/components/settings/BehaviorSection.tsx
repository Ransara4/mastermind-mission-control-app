"use client";

import { SlidersHorizontal } from "lucide-react";

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
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cm-purple focus:ring-offset-2 focus:ring-offset-dark-panel ${
        checked
          ? "bg-cm-purple"
          : "bg-dark-panel2 border border-dark-border"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const inputClasses =
  "bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple";

export default function BehaviorSection({
  settings,
  onChange,
}: SectionProps) {
  return (
    <section id="behavior">
      <h2 className="text-base font-bold text-dark-text flex items-center gap-2 mb-1">
        <SlidersHorizontal size={16} className="text-cm-purple" />
        Behavior & Safety
      </h2>
      <p className="text-xs text-dark-muted mb-4">
        Defaults, confirmations, and automation behavior.
      </p>

      {/* WhatsApp Signature */}
      <div className="py-3 border-b border-dark-border">
        <p className="text-sm font-medium text-dark-text">
          WhatsApp Signature
        </p>
        <p className="text-xs text-dark-muted mt-0.5 mb-2">
          Appended to every message sent via wacli.
        </p>
        <input
          type="text"
          value={settings.whatsappSignature}
          onChange={(e) => onChange({ whatsappSignature: e.target.value })}
          className="w-full bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple"
        />
      </div>

      {/* Confirm Destructive Actions */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Confirm Before Deleting
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            Show confirmation dialog before irreversible actions.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <Toggle
            checked={settings.confirmDestructive}
            onChange={(v) => onChange({ confirmDestructive: v })}
          />
        </div>
      </div>

      {/* Default Board Column */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Default Card Column
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            New cards land in this column on the board.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <input
            type="text"
            value={settings.defaultBoardColumn}
            onChange={(e) =>
              onChange({ defaultBoardColumn: e.target.value })
            }
            className={`w-40 ${inputClasses}`}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Keyboard Shortcuts
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            Enable global keyboard shortcuts throughout MC.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <Toggle
            checked={settings.keyboardShortcutsEnabled}
            onChange={(v) => onChange({ keyboardShortcutsEnabled: v })}
          />
        </div>
      </div>
    </section>
  );
}
