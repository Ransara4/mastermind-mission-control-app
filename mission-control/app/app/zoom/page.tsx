"use client";

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Video,
  FolderOpen,
  Clock,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  FileVideo,
  Timer,
  ChevronDown,
  ChevronRight,
  Settings,
  Activity,
  Inbox,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { useZoomData, ZoomProcessedFile, ZoomQueueItem } from "@/hooks/useZoomData";

// ── Pipeline step component ──────────────────────────────────────────

function PipelineStep({
  label,
  icon: Icon,
  active,
  count,
  last,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  count?: number;
  last?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
          active
            ? "bg-cm-purple/10 border-cm-purple/20 text-cm-purple"
            : "bg-dark-panel2 border-dark-border text-dark-muted"
        }`}
      >
        <Icon size={16} />
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span
            className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold ${
              active
                ? "bg-cm-purple/20 text-cm-purple"
                : "bg-dark-panel2 text-dark-muted"
            }`}
          >
            {count}
          </span>
        )}
      </div>
      {!last && (
        <ArrowRight size={16} className="text-dark-muted flex-shrink-0" />
      )}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-cm-purple/10 text-cm-purple",
    green: "bg-dark-success/10 text-dark-success",
    amber: "bg-dark-warn/10 text-dark-warn",
    purple: "bg-cm-purple/10 text-cm-purple",
    slate: "bg-dark-panel2 text-dark-muted",
  };
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.slate}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-dark-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-dark-text">{value}</p>
      {sub && <p className="text-xs text-dark-muted mt-1">{sub}</p>}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    idle: {
      bg: "bg-dark-success/10",
      text: "text-dark-success",
      dot: "bg-green-500",
    },
    working: {
      bg: "bg-cm-purple/10",
      text: "text-cm-purple",
      dot: "bg-cm-purple",
    },
    error: {
      bg: "bg-dark-danger/10",
      text: "text-dark-danger",
      dot: "bg-dark-danger",
    },
    disabled: {
      bg: "bg-dark-panel2",
      text: "text-dark-muted",
      dot: "bg-dark-muted",
    },
    unknown: {
      bg: "bg-dark-panel2",
      text: "text-dark-muted",
      dot: "bg-dark-muted",
    },
  };
  const s = map[status] || map.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── File name display (truncated) ────────────────────────────────────

function FileName({ path: filePath }: { path: string }) {
  const name = filePath.split("/").pop() || filePath;
  return (
    <span className="font-mono font-dm-mono text-xs truncate max-w-[280px] inline-block" title={filePath}>
      {name}
    </span>
  );
}

// ── Relative time ────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main page ────────────────────────────────────────────────────────

export default function ZoomPage() {
  const { data, loading, error, refresh } = useZoomData();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Zoom data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-2">
          Failed to load data
        </h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { status, config, processed, queue, watcherRunning, stats } = data;
  const recentProcessed = [...processed].reverse().slice(0, 10);

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="zoom" />
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
            <Video size={26} className="text-cm-purple" />
            Zoom Agent
          </h1>
          <p className="text-sm text-dark-muted mt-1">
            Auto-rename recordings and queue for Descript import
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status.status} />
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Processed"
          value={stats.totalProcessed}
          icon={CheckCircle2}
          color="green"
          sub="Total recordings renamed"
        />
        <StatCard
          label="Queued"
          value={stats.pendingInQueue}
          icon={Inbox}
          color="amber"
          sub="Waiting for Descript"
        />
        <StatCard
          label="Storage"
          value={stats.storageMB > 0 ? `${stats.storageMB} MB` : "--"}
          icon={HardDrive}
          color="purple"
          sub="Recordings directory"
        />
        <StatCard
          label="Last Run"
          value={timeAgo(status.lastRun)}
          icon={Clock}
          color="blue"
          sub={status.lastRun ? new Date(status.lastRun).toLocaleString() : "Not yet"}
        />
      </div>

      {/* ── Processing pipeline ───────────────────────────────────── */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-sm font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
          <Activity size={16} className="text-dark-muted" />
          Processing Pipeline
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <PipelineStep
            label="Detected"
            icon={Eye}
            active={watcherRunning || status.status === "working"}
            count={status.status === "working" ? 1 : undefined}
          />
          <PipelineStep
            label="Renamed"
            icon={FileVideo}
            active={stats.totalProcessed > 0}
            count={stats.totalProcessed}
          />
          <PipelineStep
            label="Queued"
            icon={Inbox}
            active={stats.pendingInQueue > 0}
            count={stats.pendingInQueue}
          />
          <PipelineStep
            label="Descript Import"
            icon={CheckCircle2}
            active={false}
            last
          />
        </div>
        <p className="text-xs text-dark-muted mt-3">
          Recordings flow left-to-right: detected in watch folder, renamed with
          clean naming convention, queued for Descript agent pickup.
        </p>
      </div>

      {/* ── File watcher status ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h2 className="text-sm font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
            {watcherRunning ? (
              <Eye size={16} className="text-dark-success" />
            ) : (
              <EyeOff size={16} className="text-dark-muted" />
            )}
            File Watcher
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-muted">Status</span>
              <span
                className={`text-sm font-medium ${
                  watcherRunning ? "text-dark-success" : "text-dark-muted"
                }`}
              >
                {watcherRunning ? "Running (fswatch)" : "Stopped"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-muted">Watch Directory</span>
              <code className="text-xs bg-dark-panel2 px-2 py-1 rounded text-dark-muted font-dm-mono">
                {config.recordingsDir}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-muted">Directory Exists</span>
              {config.recordingsDirExists ? (
                <span className="text-xs text-dark-success font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Yes
                </span>
              ) : (
                <span className="text-xs text-dark-warn font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Not found
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-muted">Last Check</span>
              <span className="text-sm text-dark-muted">
                {timeAgo(status.lastRun)}
              </span>
            </div>
          </div>
          {!watcherRunning && (
            <div className="mt-4 p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted">
                Start watcher:{" "}
                <code className="bg-dark-bg px-1.5 py-0.5 rounded text-[11px] font-dm-mono">
                  node ~/.openclaw/workspace/agents/zoom/src/index.js --watch
                </code>
              </p>
            </div>
          )}
        </div>

        {/* ── Queue status ──────────────────────────────────────────── */}
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h2 className="text-sm font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
            <Inbox size={16} className="text-dark-muted" />
            Descript Import Queue
          </h2>
          {queue.length === 0 ? (
            <div className="text-center py-6">
              <Inbox size={28} className="text-dark-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-dark-muted">Queue is empty</p>
              <p className="text-xs text-dark-muted mt-1">
                Files appear here after renaming, before Descript picks them up
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item: ZoomQueueItem, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-dark-warn/10 rounded-lg border border-dark-warn/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark-text truncate">
                      {item.meeting}
                    </p>
                    <p className="text-xs text-dark-muted">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-dark-warn">
                    <Timer size={14} />
                    <span className="text-xs font-medium">Pending</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent recordings table ───────────────────────────────── */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <div className="p-6 pb-4">
          <h2 className="text-sm font-semibold tracking-tight text-dark-text flex items-center gap-2">
            <FileVideo size={16} className="text-dark-muted" />
            Recent Recordings
            {processed.length > 0 && (
              <span className="text-xs font-normal text-dark-muted ml-1">
                ({processed.length} total)
              </span>
            )}
          </h2>
        </div>
        {recentProcessed.length === 0 ? (
          <div className="text-center py-10 px-6">
            <Video size={32} className="text-dark-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-dark-muted font-medium">
              No recordings processed yet
            </p>
            <p className="text-xs text-dark-muted mt-1">
              Recordings will appear here after the agent processes them from{" "}
              <code className="bg-dark-panel2 px-1 rounded font-dm-mono">
                {config.recordingsDir}
              </code>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-dark-border">
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">
                    Meeting
                  </th>
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">
                    Renamed To
                  </th>
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">
                    Processed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {recentProcessed.map(
                  (file: ZoomProcessedFile, i: number) => (
                    <tr key={i} className="hover:bg-dark-panel2 transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-medium text-dark-text">
                          {file.meeting || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-dark-muted">{file.date}</td>
                      <td className="px-6 py-3 text-dark-muted">
                        <FileName path={file.renamed} />
                      </td>
                      <td className="px-6 py-3 text-dark-muted text-xs">
                        {timeAgo(file.processedAt)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Settings panel (collapsible) ──────────────────────────── */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-dark-muted" />
            <span className="text-sm font-semibold tracking-tight text-dark-text">
              Configuration
            </span>
          </div>
          {settingsOpen ? (
            <ChevronDown size={18} className="text-dark-muted" />
          ) : (
            <ChevronRight size={18} className="text-dark-muted" />
          )}
        </button>
        {settingsOpen && (
          <div className="px-6 pb-6 border-t border-dark-border pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-dark-muted uppercase tracking-wider mb-1.5">
                  Recordings Directory
                </label>
                <div className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-dark-muted flex-shrink-0" />
                  <code className="text-sm bg-dark-panel2 border border-dark-border px-3 py-2 rounded-lg flex-1 text-dark-muted font-dm-mono">
                    {config.recordingsDir}
                  </code>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-muted uppercase tracking-wider mb-1.5">
                  Naming Pattern
                </label>
                <code className="text-sm bg-dark-panel2 border border-dark-border px-3 py-2 rounded-lg block text-dark-muted font-dm-mono">
                  {config.renamingPattern}
                </code>
                <p className="text-[11px] text-dark-muted mt-1">
                  Tokens: {"{date}"}, {"{time}"}, {"{meeting}"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-muted uppercase tracking-wider mb-1.5">
                  Watch Extensions
                </label>
                <div className="flex gap-2">
                  {config.watchExtensions.map((ext: string) => (
                    <span
                      key={ext}
                      className="text-xs bg-dark-panel2 border border-dark-border px-2 py-1 rounded font-mono font-dm-mono text-dark-muted"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-muted uppercase tracking-wider mb-1.5">
                  Agent Enabled
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      config.enabled ? "bg-green-500" : "bg-dark-muted"
                    }`}
                  />
                  <span className="text-sm text-dark-muted">
                    {config.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-muted uppercase tracking-wider mb-1.5">
                  Max Processed Log
                </label>
                <span className="text-sm text-dark-muted">
                  {config.processedLogMax} entries
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-muted uppercase tracking-wider mb-1.5">
                  Error Count
                </label>
                <span
                  className={`text-sm font-medium ${
                    status.errorCount > 0 ? "text-dark-danger" : "text-dark-success"
                  }`}
                >
                  {status.errorCount}
                </span>
              </div>
            </div>
            <div className="mt-5 p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted">
                Edit:{" "}
                <code className="bg-dark-bg px-1.5 py-0.5 rounded text-[11px] font-dm-mono">
                  ~/.openclaw/workspace/agents/zoom/config/config.json
                </code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Last message ──────────────────────────────────────────── */}
      {status.lastMessage && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-dark-panel2 rounded-lg mt-0.5">
              <Activity size={14} className="text-dark-muted" />
            </div>
            <div>
              <p className="text-xs font-medium text-dark-muted uppercase tracking-wider">
                Last Message
              </p>
              <p className="text-sm text-dark-text mt-0.5">
                {status.lastMessage}
              </p>
              {status.lastRun && (
                <p className="text-xs text-dark-muted mt-1">
                  {new Date(status.lastRun).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
