"use client";

import React, { useRef } from "react";
import { Palette, Upload, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";

interface MCSettings {
  theme: "dark" | "light" | "charcoal" | "neon" | "velvet" | "obsidian";
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
  logoUploading?: boolean;
  onLogoUpload?: (file: File) => void;
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

export default function AppearanceSection({
  settings,
  onChange,
  logoUploading,
  onLogoUpload,
}: SectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setTheme } = useTheme();

  const isDefaultLogo = settings.logoPath === "/icon.png";

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onLogoUpload) {
      onLogoUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section id="appearance">
      <h2 className="text-base font-bold text-dark-text flex items-center gap-2 mb-1">
        <Palette size={16} className="text-cm-purple" />
        Appearance
      </h2>
      <p className="text-xs text-dark-muted mb-4">
        Customize how Mission Control looks and feels.
      </p>

      {/* Theme */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Theme</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Choose the color scheme for the interface.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <select
            value={settings.theme}
            onChange={(e) => {
              const t = e.target.value as "dark" | "light" | "charcoal" | "neon" | "velvet" | "obsidian";
              onChange({ theme: t });
              setTheme(t);
            }}
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple cursor-pointer"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="charcoal">Charcoal</option>
            <option value="neon">Neon</option>
            <option value="velvet">Velvet</option>
            <option value="obsidian">Obsidian</option>
          </select>
        </div>
      </div>

      {/* Display Density */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">Display Density</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Control spacing and sizing across the interface.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <div className="flex rounded-lg border border-dark-border overflow-hidden">
            {(["comfortable", "compact"] as const).map((d) => (
              <button
                key={d}
                onClick={() => onChange({ displayDensity: d })}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                  settings.displayDensity === d
                    ? "bg-cm-purple text-white"
                    : "bg-dark-panel2 text-dark-muted hover:text-dark-text"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* App Name */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">App Name</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Displayed in the sidebar header and browser tab.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <input
            type="text"
            value={settings.appName}
            onChange={(e) => onChange({ appName: e.target.value })}
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple w-48"
          />
        </div>
      </div>

      {/* App Logo */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
        <div>
          <p className="text-sm font-medium text-dark-text">App Logo</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Shown in the sidebar and browser favicon.
          </p>
        </div>
        <div className="ml-4 shrink-0 flex items-center gap-3">
          <img
            src={settings.logoPath}
            alt="App logo"
            className="h-12 w-12 rounded-lg border border-dark-border object-contain bg-dark-panel2"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={logoUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
          >
            <Upload size={14} />
            {logoUploading ? "Uploading..." : "Upload"}
          </button>
          {!isDefaultLogo && (
            <button
              onClick={() => onChange({ logoPath: "/icon.png" })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text transition-colors"
            >
              <RotateCcw size={14} />
              Restore Default
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
