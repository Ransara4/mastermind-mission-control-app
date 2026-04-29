"use client";

import { useState } from "react";
import { Settings, Circle, AlertCircle } from "lucide-react";
import type { MLDashboard } from "@/lib/ml-types";

const STRATEGIES = [
  "auto",
  "balanced",
  "innovate",
  "harden",
  "repair-only",
  "early-stabilize",
  "steady-state",
];

export default function SettingsPanel({
  settings,
  daemon,
  version,
  onUpdate,
}: {
  settings: MLDashboard["settings"];
  daemon: MLDashboard["daemon"];
  version: string;
  onUpdate: (key: string, value: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hubUrl, setHubUrl] = useState(settings.a2aHubUrl);

  async function handleUpdate(key: string, value: string) {
    setSaving(key);
    setError(null);
    try {
      await onUpdate(key, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Settings</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-dark-muted">v{version}</span>
          <span className="text-dark-muted">|</span>
          <Circle
            size={8}
            className={daemon.running ? "fill-green-500 text-dark-success" : daemon.scheduled ? "fill-cm-purple text-cm-purple" : "fill-red-400 text-red-400"}
          />
          <span className={daemon.running ? "text-dark-success" : daemon.scheduled ? "text-cm-purple" : "text-dark-danger"}>
            {daemon.running ? `Running (PID ${daemon.pid})` : daemon.scheduled ? "Scheduled (3x daily)" : "Stopped"}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-3 py-2 mb-4">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strategy */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            Strategy
          </label>
          <select
            value={settings.evolveStrategy}
            onChange={(e) => handleUpdate("EVOLVE_STRATEGY", e.target.value)}
            disabled={saving === "EVOLVE_STRATEGY"}
            className="w-full px-3 py-1.5 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple disabled:opacity-50"
          >
            {STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Loop Interval */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            Loop Interval (seconds)
          </label>
          <input
            type="number"
            value={settings.pendingSleepMs / 1000}
            onChange={(e) => {
              const ms = Math.max(1, Number(e.target.value)) * 1000;
              handleUpdate("EVOLVE_PENDING_SLEEP_MS", String(ms));
            }}
            disabled={saving === "EVOLVE_PENDING_SLEEP_MS"}
            min={1}
            className="w-full px-3 py-1.5 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple disabled:opacity-50"
          />
        </div>

        {/* Ollama URL */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            Ollama URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.ollamaUrl}
              onChange={(e) => handleUpdate("OLLAMA_URL", e.target.value)}
              disabled={saving === "OLLAMA_URL"}
              className="flex-1 px-3 py-1.5 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple disabled:opacity-50"
            />
            <Circle
              size={8}
              className={`mt-2.5 ${settings.ollamaAvailable ? "fill-dark-success text-dark-success" : "fill-red-400 text-red-400"}`}
            />
          </div>
        </div>

        {/* Ollama Model */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            Embedding Model
          </label>
          <input
            type="text"
            value={settings.ollamaModel}
            onChange={(e) => handleUpdate("OLLAMA_EMBED_MODEL", e.target.value)}
            disabled={saving === "OLLAMA_EMBED_MODEL"}
            className="w-full px-3 py-1.5 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple disabled:opacity-50"
          />
        </div>

        {/* Hub URL */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            A2A Hub URL
          </label>
          <input
            type="text"
            value={hubUrl}
            onChange={(e) => setHubUrl(e.target.value)}
            onBlur={() => {
              if (hubUrl !== settings.a2aHubUrl) {
                handleUpdate("A2A_HUB_URL", hubUrl);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleUpdate("A2A_HUB_URL", hubUrl);
              }
            }}
            disabled={saving === "A2A_HUB_URL"}
            className="w-full px-3 py-1.5 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple disabled:opacity-50"
          />
        </div>

        {/* Memory Graph Provider */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            Memory Graph Provider
          </label>
          <span className="inline-block px-3 py-1.5 text-sm bg-dark-panel2 text-dark-text rounded-lg">
            {settings.memoryGraphProvider}
          </span>
        </div>

        {/* Auto Publish */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-dark-text">
            Auto Publish
          </label>
          <button
            onClick={() =>
              handleUpdate(
                "EVOLVER_AUTO_PUBLISH",
                settings.autoPublish ? "false" : "true"
              )
            }
            disabled={saving === "EVOLVER_AUTO_PUBLISH"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              settings.autoPublish ? "bg-cm-purple" : "bg-dark-panel2"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoPublish ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Default Visibility */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-dark-text">
            Default Visibility
          </label>
          <button
            onClick={() =>
              handleUpdate(
                "EVOLVER_DEFAULT_VISIBILITY",
                settings.defaultVisibility === "public" ? "private" : "public"
              )
            }
            disabled={saving === "EVOLVER_DEFAULT_VISIBILITY"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              settings.defaultVisibility === "public"
                ? "bg-cm-purple"
                : "bg-dark-panel2"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.defaultVisibility === "public"
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <p className="text-xs text-dark-muted mt-4">
        Changes take effect on next evolution cycle
      </p>
    </div>
  );
}
