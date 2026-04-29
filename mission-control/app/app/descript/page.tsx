"use client";

import { useState } from "react";
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Clock,
  FolderInput,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

export default function DescriptPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ApiKeyBanner slug="descript" />
      {/* 1. Hero / Overview */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🎬</div>
          <div>
            <h1 className="text-2xl font-extrabold text-dark-text">
              Descript Agent
            </h1>
            <p className="text-dark-muted mt-1">
              Imports recordings into Descript for editing. Reads from the Zoom
              agent&apos;s ready queue and opens files automatically. API key
              configured — see capabilities below.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-dark-success/100 rounded-full"></div>
            <span className="text-sm text-dark-muted">Idle</span>
          </div>
        </div>
      </div>

      {/* 2. API Key Status */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <h3 className="font-semibold text-dark-text mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-dark-success" />
          API Key Configured
        </h3>
        <p className="text-sm text-dark-muted mb-3">
          <code className="bg-dark-panel2 border border-dark-border px-1.5 py-0.5 rounded text-xs font-mono text-dark-text">
            DESCRIPT_API_KEY
          </code>{" "}
          is set in{" "}
          <code className="bg-dark-panel2 border border-dark-border px-1.5 py-0.5 rounded text-xs font-mono text-dark-text">
            ~/.openclaw/workspace/.env
          </code>
          . The current agent uses local app-launching (no API calls), but the
          key is ready if you want to wire up programmatic imports or AI editing
          jobs.
        </p>
        <p className="text-xs text-dark-muted">
          Generate or rotate tokens at{" "}
          <span className="font-mono text-cm-purple">
            app.descript.com → Settings → API tokens
          </span>
        </p>
      </div>

      {/* 3. Capabilities */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setCapabilitiesOpen(!capabilitiesOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <FolderInput size={20} className="text-dark-muted" />
            <span className="font-semibold text-dark-text">
              What It Can Do (Agent + API)
            </span>
          </div>
          {capabilitiesOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {capabilitiesOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-dark-border pt-4">
            {/* Agent capabilities */}
            <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide">
              Local Agent (current)
            </p>
            <div className="space-y-3">
              {[
                {
                  title: "Auto-Import from Zoom Queue",
                  desc: (
                    <>
                      When the Zoom agent renames{" "}
                      <code className="bg-cm-purple/20 px-1 rounded text-xs">
                        2026-03-10 - Weekly Standup.mp4
                      </code>
                      , the Descript agent picks it up and opens it in Descript
                      for immediate editing with auto-transcription.
                    </>
                  ),
                },
                {
                  title: "Manual File Import",
                  desc: (
                    <>
                      Import any video or audio file directly:{" "}
                      <code className="bg-cm-purple/20 px-1 rounded text-xs">
                        node src/index.js --import ~/path/to/video.mp4
                      </code>
                    </>
                  ),
                },
                {
                  title: "Import History",
                  desc: (
                    <>
                      Tracks every import in{" "}
                      <code className="bg-cm-purple/20 px-1 rounded text-xs">
                        data/import-history.json
                      </code>{" "}
                      with timestamps, meeting names, and dates. Keeps the last
                      500 entries.
                    </>
                  ),
                },
                {
                  title: "Queue Cleanup",
                  desc: "After importing, automatically removes processed items from the Zoom queue. Failed imports stay in queue for retry on next run.",
                },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20"
                >
                  <h4 className="font-medium text-cm-purple">{title}</h4>
                  <p className="text-sm text-cm-purple mt-1">{desc}</p>
                </div>
              ))}
            </div>

            {/* API capabilities */}
            <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide pt-2">
              Descript API — what&apos;s possible (as of March 2026)
            </p>
            <div className="space-y-2">
              {[
                {
                  ok: true,
                  text: "Import video/audio from URL into a new project (WAV, FLAC, MP3, MOV, MP4 — max 1 GB)",
                },
                {
                  ok: true,
                  text: "Auto-transcription on import",
                },
                {
                  ok: true,
                  text: "AI editing via natural language prompts (remove filler words, Studio Sound, captions, B-roll, translation)",
                },
                {
                  ok: true,
                  text: "Query job status + cancel jobs; webhook callback on completion",
                },
                {
                  ok: true,
                  text: "Job history (up to 30 days)",
                },
                {
                  ok: false,
                  text: "Export / download finished projects programmatically — not available via API, must export manually in the app",
                },
                {
                  ok: false,
                  text: "Import into an existing project — API always creates a new project",
                },
                {
                  ok: false,
                  text: "AI editing (Underlord/agent edits) on free/Pro plans — Enterprise add-on only",
                },
              ].map(({ ok, text }, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {ok ? (
                    <CheckCircle2
                      size={15}
                      className="text-dark-success mt-0.5 shrink-0"
                    />
                  ) : (
                    <XCircle
                      size={15}
                      className="text-dark-danger mt-0.5 shrink-0"
                    />
                  )}
                  <span className={ok ? "text-dark-text" : "text-dark-muted"}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-3 flex items-start gap-2 mt-2">
              <AlertCircle size={14} className="text-dark-warn mt-0.5 shrink-0" />
              <p className="text-xs text-dark-warn">
                <span className="font-semibold">API is in beta.</span> The Descript
                API (descriptapi.com) launched publicly but AI editing jobs are
                Enterprise-only. Basic import + transcription should work on a
                standard plan. No SLA guarantees yet.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Settings Panel */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-dark-muted" />
            <span className="font-semibold text-dark-text">Settings</span>
          </div>
          {settingsOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {settingsOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-dark-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Descript App Path
                </label>
                <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-text">
                  /Applications/Descript.app
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Auto-Open on Queue
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-dark-success/100 rounded-full"></div>
                  <span className="text-sm text-dark-muted">Enabled</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Zoom Queue Path
              </label>
              <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-text">
                ~/.openclaw/workspace/agents/zoom/data/ready-queue.json
              </code>
              <p className="text-xs text-dark-muted mt-1">
                Edit: agents/descript/config/config.json
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Status / Activity */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h3 className="font-bold text-dark-text mb-4 flex items-center gap-2">
          <RefreshCw size={18} className="text-dark-muted" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-dark-panel2 rounded-lg">
            <Clock size={16} className="text-dark-muted" />
            <span className="text-sm text-dark-muted">
              Agent created, awaiting first run. Install Descript to get started.
            </span>
          </div>
          <div className="text-xs text-dark-muted mt-2">
            Run{" "}
            <code className="bg-dark-panel2 px-1.5 py-0.5 rounded">
              node ~/.openclaw/workspace/agents/descript/src/index.js --preflight
            </code>{" "}
            to check setup status.
          </div>
        </div>
      </div>
    </div>
  );
}
