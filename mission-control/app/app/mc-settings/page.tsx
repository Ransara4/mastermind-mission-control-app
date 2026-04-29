"use client";

import { useState, useEffect, useRef } from "react";
import {
  Settings,
  Palette,
  Cpu,
  Bell,
  Database,
  LayoutDashboard,
  SlidersHorizontal,
  Loader2,
  Check,
  Download,
  Upload,
  RotateCcw,
  Info,
  Camera,
  Linkedin,
  Music2,
  Globe,
  Network,
  ExternalLink,
} from "lucide-react";
import AppearanceSection from "@/components/settings/AppearanceSection";
import SystemControlsSection from "@/components/settings/SystemControlsSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import DataManagementSection from "@/components/settings/DataManagementSection";
import DisplayPreferencesSection from "@/components/settings/DisplayPreferencesSection";
import BehaviorSection from "@/components/settings/BehaviorSection";
import EmailSection from "@/components/settings/EmailSection";

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
  // System Controls
  timezone: string;
  agentBrowserPort: 9222 | 9223 | 9224;

  // Performance
  nodeMemoryCap: number;

  // Email & Daily Briefing
  emailProvider: "gmail" | "mandrill" | "resend" | "sendgrid" | "ses" | "postmark";
  emailRecipient: string;
  emailFromName: string;
  dailyBriefingEnabled: boolean;
  dailyBriefingTime: string;
}

const DEFAULT_SETTINGS: MCSettings = {
  theme: "dark",
  appName: "Mission Control",
  logoPath: "/icon.png",
  displayDensity: "comfortable",
  agentExecutionMode: "active",
  llmCostTier: "balanced",
  dailyBudgetCap: 0,
  startupPage: "/app/tasks",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  autoArchiveDays: 0,
  screenshotRetentionEnabled: false,
  screenshotRetentionDays: 7,
  dateFormat: "MMM DD, YYYY",
  timeFormat: "12h",
  currencyPrimary: "USD",
  currencySecondary: "IDR",
  currencyExchangeRate: 16000,
  rowsPerPage: 25,
  refreshInterval: 30,
  whatsappSignature: "— Sent from Joe's Agent Uni 🦄",
  confirmDestructive: true,
  defaultBoardColumn: "Claude Code",
  keyboardShortcutsEnabled: true,
  timezone: "America/New_York",
  agentBrowserPort: 9223 as const,
  nodeMemoryCap: 450,
  emailProvider: "gmail" as const,
  emailRecipient: "",
  emailFromName: "Mission Control",
  dailyBriefingEnabled: false,
  dailyBriefingTime: "06:45",
};

const NAV_ITEMS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "system", label: "System", icon: Cpu },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data", icon: Database },
  { id: "display", label: "Display", icon: LayoutDashboard },
  { id: "behavior", label: "Behavior", icon: SlidersHorizontal },
  { id: "email", label: "Email", icon: Settings },
];

const NAV_LINKS = [
  { href: "/app/mc-settings/ports", label: "Port Reference", icon: Network },
];

export default function McSettingsPage() {
  const [settings, setSettings] = useState<MCSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<MCSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [logoUploading, setLogoUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    fetch("/api/mc-settings")
      .then((r) => r.json())
      .then((data) => {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        setSavedSettings(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleChange(updates: Partial<MCSettings>) {
    setSettings((prev) => ({ ...prev, ...updates }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/mc-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedSettings({ ...settings });
      const now = new Date();
      setLastSaved(
        now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      );
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    setSettings({ ...DEFAULT_SETTINGS });
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mc-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        setSettings(prev => ({ ...prev, ...imported }));
      } catch {
        alert('Invalid settings file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/mc-settings/logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      handleChange({ logoPath: data.logoPath });
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-cm-purple" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hidden file input for logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImport}
      />

      <div className="space-y-6">
        {/* Hero Header */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cm-purple/15 rounded-xl">
                <Settings size={24} className="text-cm-purple" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-dark-text">
                  Mission Control Settings
                </h2>
                <p className="text-sm text-dark-muted mt-1">
                  Configure your workspace, agents, and display preferences.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {saveStatus === "success" && (
                <span className="flex items-center gap-1.5 text-sm text-dark-success">
                  <Check size={14} /> Settings saved!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-dark-danger">Error saving</span>
              )}
              {hasChanges && saveStatus === "idle" && (
                <span className="text-xs text-dark-warn bg-dark-warn/10 border border-dark-warn/20 rounded-full px-3 py-1">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* Left Nav + Content */}
        <div className="flex gap-6">
          {/* Left nav -- sticky */}
          <nav className="w-44 shrink-0 sticky top-20 self-start">
            <div className="bg-dark-panel border border-dark-border rounded-xl p-3 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-muted hover:text-dark-text hover:bg-dark-panel2 transition-colors group"
                >
                  <item.icon
                    size={14}
                    className="text-cm-purple/60 group-hover:text-cm-purple transition-colors"
                  />
                  {item.label}
                </a>
              ))}
              <div className="border-t border-dark-border mt-1 pt-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-muted hover:text-dark-text hover:bg-dark-panel2 transition-colors group"
                  >
                    <link.icon
                      size={14}
                      className="text-cm-purple/60 group-hover:text-cm-purple transition-colors"
                    />
                    <span className="flex-1">{link.label}</span>
                    <ExternalLink size={10} className="opacity-40 group-hover:opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          </nav>

          {/* Section cards */}
          <div className="flex-1 space-y-4">
            <div
              id="appearance"
              className="bg-dark-panel border border-dark-border rounded-xl p-6 scroll-mt-20"
            >
              <AppearanceSection
                settings={settings}
                onChange={handleChange}
                logoUploading={logoUploading}
                onLogoUpload={handleLogoUpload}
              />
            </div>

            <div
              id="system"
              className="bg-dark-panel border border-dark-border rounded-xl p-6 scroll-mt-20"
            >
              <SystemControlsSection settings={settings} onChange={handleChange} />
            </div>

            <div
              id="notifications"
              className="bg-dark-panel border border-dark-border rounded-xl p-6 scroll-mt-20"
            >
              <NotificationsSection settings={settings} onChange={handleChange} />
            </div>

            <div
              id="data"
              className="bg-dark-panel border border-dark-border rounded-xl p-6 scroll-mt-20"
            >
              <DataManagementSection settings={settings} onChange={handleChange} />
            </div>

            <div
              id="display"
              className="bg-dark-panel border border-dark-border rounded-xl p-6 scroll-mt-20"
            >
              <DisplayPreferencesSection settings={settings} onChange={handleChange} />
            </div>

            <div
              id="behavior"
              className="bg-dark-panel border border-dark-border rounded-xl p-6 scroll-mt-20"
            >
              <BehaviorSection settings={settings} onChange={handleChange} />
            </div>

            <div
              id="email"
              className="bg-dark-panel border border-dark-border rounded-xl p-6 scroll-mt-20"
            >
              <EmailSection settings={settings} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Import / Export Settings */}
        <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border">
            <p className="font-semibold text-dark-text">Import / Export Settings</p>
            <p className="text-xs text-dark-muted mt-0.5">
              Back up your settings or restore from a previous export.
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-text bg-dark-panel2 border border-dark-border rounded-lg hover:border-cm-purple hover:text-cm-purple transition-colors"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-text bg-dark-panel2 border border-dark-border rounded-lg hover:border-cm-purple hover:text-cm-purple transition-colors"
              >
                <Upload size={14} />
                Import
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <RotateCcw size={14} />
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border">
            <p className="font-semibold text-dark-text">About</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* Build version + attribution */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-3 py-1">
                v0.1.0-beta
              </span>
              <span className="text-sm text-dark-muted">Built by Joe Che</span>
            </div>

            {/* Social links */}
            <div className="flex flex-wrap gap-2">
              <a
                href="https://www.instagram.com/joe.che.official"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-muted bg-dark-panel2 border border-dark-border hover:border-cm-purple hover:text-white transition-colors"
              >
                <Camera size={13} />
                Instagram
              </a>
              <a
                href="https://www.linkedin.com/in/joeche1/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-muted bg-dark-panel2 border border-dark-border hover:border-cm-purple hover:text-white transition-colors"
              >
                <Linkedin size={13} />
                LinkedIn
              </a>
              <a
                href="https://www.tiktok.com/@joeche6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-muted bg-dark-panel2 border border-dark-border hover:border-cm-purple hover:text-white transition-colors"
              >
                <Music2 size={13} />
                TikTok
              </a>
              <a
                href="https://mastermindshq.business"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-muted bg-dark-panel2 border border-dark-border hover:border-cm-purple hover:text-white transition-colors"
              >
                <Globe size={13} />
                mastermindshq.business
              </a>
            </div>

            {/* Disclaimer */}
            <div className="flex gap-2.5 bg-dark-panel2 border border-dark-border rounded-lg px-4 py-3 text-sm text-dark-muted leading-relaxed">
              <Info size={14} className="shrink-0 text-cm-purple mt-0.5" />
              <span>
                This is one person building. I can&apos;t guarantee that everything will work in all
                circumstances. This is YOURS to play with. Build and change anything that you want.
                Make it YOUR AI operating system.
              </span>
            </div>
          </div>
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
