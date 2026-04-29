"use client";

import { LayoutDashboard } from "lucide-react";

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
  timezone: string;
  agentBrowserPort: 9222 | 9223 | 9224;
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

function previewDate(format: string, timeFormat: string): string {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  let datePart = '';
  if (format === 'MMM DD, YYYY') {
    datePart = `${MONTHS[month]} ${day.toString().padStart(2,'0')}, ${year}`;
  } else if (format === 'DD/MM/YYYY') {
    datePart = `${day.toString().padStart(2,'0')}/${(month+1).toString().padStart(2,'0')}/${year}`;
  } else {
    datePart = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
  }

  let timePart = '';
  if (timeFormat === '12h') {
    const h12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    timePart = `${h12}:${minutes} ${ampm}`;
  } else {
    timePart = `${hours.toString().padStart(2,'0')}:${minutes}`;
  }

  return `${datePart}  ${timePart}`;
}

const inputClasses =
  "bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple";

export default function DisplayPreferencesSection({
  settings,
  onChange,
}: SectionProps) {
  return (
    <section id="display">
      <h2 className="text-base font-bold text-dark-text flex items-center gap-2 mb-1">
        <LayoutDashboard size={16} className="text-cm-purple" />
        Display Preferences
      </h2>
      <p className="text-xs text-dark-muted mb-4">
        How dates, numbers, and data tables appear across MC.
      </p>

      {/* Date Format */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Date Format</p>
          <p className="text-xs text-dark-muted mt-0.5">
            How dates are displayed throughout the interface.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <select
            value={settings.dateFormat}
            onChange={(e) =>
              onChange({
                dateFormat: e.target.value as MCSettings["dateFormat"],
              })
            }
            className={inputClasses}
          >
            <option value="MMM DD, YYYY">Jan 15, 2026</option>
            <option value="DD/MM/YYYY">15/01/2026</option>
            <option value="YYYY-MM-DD">2026-01-15</option>
          </select>
        </div>
      </div>

      {/* Time Format */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Time Format</p>
          <p className="text-xs text-dark-muted mt-0.5">
            12-hour or 24-hour clock display.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="flex rounded-lg border border-dark-border overflow-hidden">
            {(["12h", "24h"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onChange({ timeFormat: t })}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  settings.timeFormat === t
                    ? "bg-cm-purple text-white"
                    : "bg-dark-panel2 text-dark-muted hover:text-dark-text"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Preview</p>
          <p className="text-xs text-dark-muted mt-0.5">How dates and times will appear across MC.</p>
        </div>
        <div className="ml-4 shrink-0">
          <span className="font-mono text-sm text-cm-purple bg-cm-purple/10 border border-cm-purple/20 rounded-lg px-3 py-1.5">
            {previewDate(settings.dateFormat, settings.timeFormat)}
          </span>
        </div>
      </div>

      {/* Currency Display */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Currency Display
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            Primary currency + optional secondary with live conversion.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={settings.currencyPrimary}
              onChange={(e) =>
                onChange({ currencyPrimary: e.target.value })
              }
              className={inputClasses}
            >
              {["USD", "EUR", "GBP", "AUD", "SGD", "IDR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="text-dark-muted text-xs">+</span>
            <select
              value={settings.currencySecondary}
              onChange={(e) =>
                onChange({ currencySecondary: e.target.value })
              }
              className={inputClasses}
            >
              {["IDR", "USD", "EUR", "GBP", "AUD", "SGD", "None"].map(
                (c) => (
                  <option key={c}>{c}</option>
                )
              )}
            </select>
            <span className="text-dark-muted text-xs">@ 1 USD =</span>
            <input
              type="number"
              value={settings.currencyExchangeRate}
              onChange={(e) =>
                onChange({
                  currencyExchangeRate: parseFloat(e.target.value) || 0,
                })
              }
              className={`w-24 ${inputClasses}`}
            />
          </div>
        </div>
      </div>

      {/* Rows Per Page */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Rows Per Page</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Default number of rows shown in data tables.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <select
            value={settings.rowsPerPage}
            onChange={(e) =>
              onChange({ rowsPerPage: parseInt(e.target.value) })
            }
            className={inputClasses}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-Refresh Interval */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">
            Auto-Refresh Interval
          </p>
          <p className="text-xs text-dark-muted mt-0.5">
            How often dashboards poll for new data.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={5}
              value={settings.refreshInterval}
              onChange={(e) =>
                onChange({
                  refreshInterval: parseInt(e.target.value) || 0,
                })
              }
              className={`w-20 ${inputClasses} text-center`}
            />
            <span className="text-sm text-dark-muted">
              sec{settings.refreshInterval === 0 ? " (off)" : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
