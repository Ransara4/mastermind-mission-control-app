"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Moon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  TrendingUp,
  Sparkles,
  Settings,
  LayoutDashboard,
} from "lucide-react";

interface RunEntry {
  date: string;
  status: "success" | "failed";
  exitCode: number;
  duration?: number;
  skillsAdded?: number;
  summary?: string;
}

interface Report {
  date: string;
  filename: string;
  content: string;
}

interface SettingsData {
  whoIAm: string;
  missionAndGoals: string;
  parametersAndRules: string;
  updatedAt: string | null;
}

interface SantaClausData {
  reports: Report[];
  runs: RunEntry[];
  logs: string[];
  stats: {
    totalRuns: number;
    successRate: number;
    lastRun: string | null;
    skillsAdded: number;
  };
  settings: SettingsData;
  isRunning: boolean;
}

const DEFAULT_WHO_I_AM = `Joe Che Tandle — Entrepreneur, mentor, and multi-venture builder based in Bali, Indonesia (GMT+8).

Businesses:
- The Connection Map — Premium mentorship and mastermind hosting
- Seven Seeds of Success® — Alternative early-childhood education (client: Beata Fuller)
- CashClaw — AI-powered business automation services
- Real Estate — 3 active Bali properties
- OpenClaw — AI operating system running 30+ autonomous agents

I run high-ticket coaching ($18K/yr family mentorship), create content for Instagram/LinkedIn/YouTube/TikTok, manage client relationships, and build autonomous AI systems that generate revenue while I sleep.`;

const DEFAULT_MISSION = `Primary Goals:
1. Scale mentorship practice to 20+ active clients without increasing my time investment
2. Build Windfall (weather betting app) — raise $650K-1M, launch MVP
3. Generate $10K+/month in passive/autonomous revenue through AI agents
4. Create consistent, high-quality content across Instagram, LinkedIn, YouTube, and TikTok
5. Keep all 30+ agents healthy, secure, and improving autonomously

Santa Claus should focus on:
- Tools that save me time on client management and content creation
- Revenue-generating automation I don't have to touch
- Small business tools that any solopreneur would need
- Making Mission Control more useful every day`;

const DEFAULT_PARAMS = `Budget: Max $50/run on Claude API costs
Pace: Max 2 new skills + 2 new MC pages per night
Security: ALWAYS run GuardDog before installing anything. Zero tolerance for malicious packages.
Schedule: Runs at 5:00 AM GMT+8 (while I'm sleeping)
Protected files: Never modify .env, CLAUDE.md, SOUL.md, USER.md
Never delete: Existing skills, agents, or MC pages
Priority order: Revenue-generating > time-saving > nice-to-have
If stuck: Try agents → headless browser → agent-browser → Telegram alert to Joe
Always: Send Telegram summary naming what was searched, scanned, built, and recommended
Always: Leave a detailed report with every file created and every security scan result
Testing: Verify MC still loads (HTTP 200) after every change
Rollback: Keep backup before building, restore if anything breaks`;

function SettingsSection({
  label,
  description,
  value,
  onChange,
  onSave,
  saving,
  saved,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-dark-text font-semibold">{label}</h3>
          <p className="text-dark-muted text-sm mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-dark-success text-sm font-medium animate-pulse">
              Saved
            </span>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-dark-panel2 border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple resize-y min-h-[150px]"
        rows={8}
      />
    </div>
  );
}

export default function SantaClausPage() {
  const [data, setData] = useState<SantaClausData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");
  const [reindeerHerd, setReindeerHerd] = useState<number[]>([]);

  // Settings state
  const [whoIAm, setWhoIAm] = useState(DEFAULT_WHO_I_AM);
  const [missionAndGoals, setMissionAndGoals] = useState(DEFAULT_MISSION);
  const [parametersAndRules, setParametersAndRules] = useState(DEFAULT_PARAMS);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/santa");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      // Populate settings from API
      if (json.settings) {
        if (json.settings.whoIAm) setWhoIAm(json.settings.whoIAm);
        if (json.settings.missionAndGoals) setMissionAndGoals(json.settings.missionAndGoals);
        if (json.settings.parametersAndRules) setParametersAndRules(json.settings.parametersAndRules);
      }
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll every 5s while running to detect when Santa finishes
  useEffect(() => {
    if (!data?.isRunning) return;
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [data?.isRunning, fetchData]);

  const launchReindeerHerd = useCallback(() => {
    const count = 6 + Math.floor(Math.random() * 5); // 6-10 reindeer
    const ids = Array.from({ length: count }, (_, i) => i);
    setReindeerHerd(ids);
    // Clear after all animations finish (last one starts at ~4s, runs 3.5s)
    setTimeout(() => setReindeerHerd([]), 8000);
  }, []);

  const handleTrigger = async () => {
    setTriggering(true);
    launchReindeerHerd();
    try {
      await fetch("/api/santa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger" }),
      });
      await fetchData();
    } finally {
      setTriggering(false);
    }
  };

  const handleSave = async (field: "whoIAm" | "missionAndGoals" | "parametersAndRules") => {
    setSavingField(field);
    try {
      const payload: Record<string, string> = { action: "save-settings" };
      if (field === "whoIAm") payload.whoIAm = whoIAm;
      if (field === "missionAndGoals") payload.missionAndGoals = missionAndGoals;
      if (field === "parametersAndRules") payload.parametersAndRules = parametersAndRules;

      await fetch("/api/santa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setSavedField(field);
      setTimeout(() => setSavedField(null), 2000);
    } finally {
      setSavingField(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Santa Claus data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold text-dark-text mb-2">Failed to load data</h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats || { totalRuns: 0, successRate: 0, lastRun: null, skillsAdded: 0 };
  const runs = data?.runs || [];
  const latestReport = data?.reports?.[0] || null;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes reindeer-fly {
          0%   { transform: translateX(-120px) translateY(var(--dy, 0px)) scaleX(-1); opacity: 0; }
          5%   { opacity: 1; }
          50%  { transform: translateX(calc(100vw + 60px)) translateY(calc(var(--dy, 0px) - 40px)) scaleX(-1); opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateX(calc(100vw + 120px)) translateY(var(--dy, 0px)) scaleX(-1); opacity: 0; }
        }
        .reindeer-animate {
          animation: reindeer-fly 3.5s ease-in-out forwards;
        }
      `}</style>
      {reindeerHerd.map((id) => {
        const topPct = 10 + (id * 7) % 35;
        const delay = id * 0.45;
        const size = 38 + (id % 3) * 10;
        return (
          <div
            key={id}
            className="reindeer-animate fixed z-50 pointer-events-none"
            style={{
              top: `${topPct}vh`,
              left: 0,
              fontSize: `${size}px`,
              lineHeight: 1,
              animationDelay: `${delay}s`,
              opacity: 0,
            }}
          >
            🦌
          </div>
        );
      })}
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cm-purple/15 rounded-lg">
              <Moon className="text-cm-purple" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-dark-text">Santa Claus</h1>
              <p className="text-sm text-dark-muted">Every night at 5 AM, Santa goes to work. He researches opportunities aligned with your goals, hunts for passive income you can set and forget, and builds new tools straight into your system. By the time you wake up, the presents are already under the tree.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTrigger}
              disabled={triggering || !!data?.isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {data?.isRunning || triggering ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Santa is Running...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Trigger Manual Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-dark-panel border border-dark-border rounded-lg p-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-cm-purple text-white"
              : "text-dark-muted hover:text-dark-text"
          }`}
        >
          <LayoutDashboard size={14} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-cm-purple text-white"
              : "text-dark-muted hover:text-dark-text"
          }`}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-dark-muted" />
                <span className="text-xs text-dark-muted">Total Runs</span>
              </div>
              <p className="text-2xl font-bold text-dark-text">{stats.totalRuns}</p>
            </div>
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-dark-muted" />
                <span className="text-xs text-dark-muted">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-dark-text">
                {stats.successRate}
                <span className="text-sm text-dark-muted ml-0.5">%</span>
              </p>
            </div>
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-dark-muted" />
                <span className="text-xs text-dark-muted">Skills Added</span>
              </div>
              <p className="text-2xl font-bold text-dark-text">{stats.skillsAdded}</p>
            </div>
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-dark-muted" />
                <span className="text-xs text-dark-muted">Last Run</span>
              </div>
              <p className="text-sm font-bold text-dark-text">
                {stats.lastRun ? new Date(stats.lastRun).toLocaleDateString() : "Never"}
              </p>
            </div>
          </div>

          {/* Run History */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h2 className="text-lg font-bold tracking-tight text-dark-text mb-4">Run History</h2>
            {runs.length === 0 ? (
              <p className="text-dark-muted text-sm">No runs recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {runs.slice(0, 20).map((run, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 bg-dark-panel2 border border-dark-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {run.status === "success" ? (
                        <CheckCircle2 size={16} className="text-dark-success" />
                      ) : (
                        <XCircle size={16} className="text-dark-danger" />
                      )}
                      <span className="text-sm text-dark-text">
                        {new Date(run.date).toLocaleString()}
                      </span>
                      {run.summary && (
                        <span className="text-xs text-dark-muted truncate max-w-xs">{run.summary}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {run.skillsAdded ? (
                        <span className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
                          +{run.skillsAdded} skills
                        </span>
                      ) : null}
                      {run.duration ? (
                        <span className="text-xs text-dark-muted">{run.duration}s</span>
                      ) : null}
                      <span
                        className={`text-xs font-medium ${
                          run.status === "success" ? "text-dark-success" : "text-dark-danger"
                        }`}
                      >
                        {run.status === "success" ? "Success" : "Failed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Report */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h2 className="text-lg font-bold tracking-tight text-dark-text mb-4">Latest Report</h2>
            {latestReport ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
                    {latestReport.date}
                  </span>
                  <span className="text-xs text-dark-muted">{latestReport.filename}</span>
                </div>
                <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
                  <pre className="text-sm text-dark-text whitespace-pre-wrap font-mono leading-relaxed">
                    {latestReport.content}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-dark-muted text-sm">No reports yet. The agent will generate reports after each nightly run.</p>
            )}
          </div>
        </>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <SettingsSection
            label="Who I Am"
            description="Your background, businesses, and what you do. Santa Claus uses this to understand what tools and improvements would actually help you."
            value={whoIAm}
            onChange={setWhoIAm}
            onSave={() => handleSave("whoIAm")}
            saving={savingField === "whoIAm"}
            saved={savedField === "whoIAm"}
          />
          <SettingsSection
            label="Mission & Goals"
            description="What you're trying to accomplish. Santa Claus prioritizes improvements that serve these goals."
            value={missionAndGoals}
            onChange={setMissionAndGoals}
            onSave={() => handleSave("missionAndGoals")}
            saving={savingField === "missionAndGoals"}
            saved={savedField === "missionAndGoals"}
          />
          <SettingsSection
            label="Parameters & Rules"
            description="Constraints and rules for what Santa Claus can and cannot do each night."
            value={parametersAndRules}
            onChange={setParametersAndRules}
            onSave={() => handleSave("parametersAndRules")}
            saving={savingField === "parametersAndRules"}
            saved={savedField === "parametersAndRules"}
          />
        </div>
      )}
    </div>
  );
}
