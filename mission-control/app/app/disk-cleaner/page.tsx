"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Loader,
  Trash2,
  FolderOpen,
  BarChart3,
  Eye,
  X as XIcon,
  Globe,
  Code2,
  FileSearch,
  Wrench,
  Smartphone,
  Zap,
} from "lucide-react";

interface CleanedItem {
  path: string;
  size_mb: number;
  reason: string;
}

interface CleanupRun {
  timestamp: string;
  bytes_freed: number;
  items_cleaned: CleanedItem[];
  errors: string[];
  duration_ms: number;
  disk_free_bytes?: number;
}

interface Status {
  agent: string;
  status: string;
  lastRun: string;
  summary: string;
  nextRun: string;
}

interface DiskStats {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentUsed: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function formatGb(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// Map cleanup reasons to categories
function categorizeReason(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("cache")) return "Caches";
  if (r.includes("log")) return "Logs";
  if (r.includes("trash")) return "Trash";
  if (r.includes("npm")) return "npm";
  if (r.includes("brew")) return "Homebrew";
  if (r.includes(".next") || r.includes("build")) return "Build artifacts";
  if (r.includes("tmp") || r.includes("orphan")) return "Tmp folders";
  if (r.includes("xcode") || r.includes("deriveddata")) return "Xcode";
  return "Other";
}

function buildCategoryBreakdown(
  items: CleanedItem[]
): Record<string, { count: number; sizeMb: number }> {
  return items.reduce<Record<string, { count: number; sizeMb: number }>>(
    (acc, item) => {
      const cat = categorizeReason(item.reason);
      if (!acc[cat]) acc[cat] = { count: 0, sizeMb: 0 };
      acc[cat].count += 1;
      acc[cat].sizeMb += item.size_mb;
      return acc;
    },
    {}
  );
}

export default function DiskCleanerPage() {
  const [lastRun, setLastRun] = useState<CleanupRun | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [history, setHistory] = useState<CleanupRun[]>([]);
  const [diskStats, setDiskStats] = useState<DiskStats | null>(null);
  const [lifetimeStats, setLifetimeStats] = useState<{ totalBytesFreed: number; totalRuns: number; firstRun: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<CleanupRun | null>(null);

  // Extra panels state
  const [largeFiles, setLargeFiles] = useState<{ path: string; size_mb: number; modified: string }[] | null>(null);
  const [largeFilesLoading, setLargeFilesLoading] = useState(false);
  const [browserCaches, setBrowserCaches] = useState<Record<string, { sizeMb: number; paths: string[] }> | null>(null);
  const [devArtifacts, setDevArtifacts] = useState<{ path: string; size_mb: number; type: string; ageDays: number }[] | null>(null);
  const [systemTuneup, setSystemTuneup] = useState<{
    memory: { totalGb: number; freeGb: number; usedGb: number; pressureLevel: string };
    iosBackups: { count: number; totalSizeMb: number; backups: { path: string; sizeMb: number; date: string }[] };
    dnsCache: { canFlush: boolean };
  } | null>(null);
  const [dnsFlushStatus, setDnsFlushStatus] = useState<"idle" | "flushing" | "done" | "error">("idle");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/disk-cleaner");
      const data = await res.json();
      if (data.success) {
        setLastRun(data.lastRun);
        setStatus(data.status);
        setHistory(data.history || []);
        setDiskStats(data.diskStats || null);
        setLifetimeStats(data.lifetimeStats || null);
      }
    } catch (err) {
      console.error("Failed to load disk-cleaner data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExtras = async () => {
    // Fire all three extra scans in parallel — non-blocking, best-effort
    Promise.all([
      fetch("/api/disk-cleaner/browser-cache").then(r => r.json()).then(d => { if (d.success) setBrowserCaches(d.browsers); }).catch(() => {}),
      fetch("/api/disk-cleaner/dev-artifacts").then(r => r.json()).then(d => { if (d.success) setDevArtifacts(d.artifacts); }).catch(() => {}),
      fetch("/api/disk-cleaner/system-tuneup").then(r => r.json()).then(d => { if (d.success) setSystemTuneup(d); }).catch(() => {}),
    ]);
  };

  const fetchLargeFiles = async () => {
    setLargeFilesLoading(true);
    try {
      const res = await fetch("/api/disk-cleaner/large-files?threshold=200");
      const data = await res.json();
      if (data.success) setLargeFiles(data.files);
    } catch {}
    setLargeFilesLoading(false);
  };

  const handleFlushDNS = async () => {
    setDnsFlushStatus("flushing");
    try {
      const res = await fetch("/api/disk-cleaner/system-tuneup/flush-dns", { method: "POST" });
      const data = await res.json();
      setDnsFlushStatus(data.success ? "done" : "error");
      setTimeout(() => setDnsFlushStatus("idle"), 3000);
    } catch {
      setDnsFlushStatus("error");
      setTimeout(() => setDnsFlushStatus("idle"), 3000);
    }
  };

  useEffect(() => {
    fetchData();
    fetchExtras();
  }, []);

  const handlePreview = async () => {
    setPreviewing(true);
    setRunError("");
    try {
      const res = await fetch("/api/disk-cleaner/preview", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setRunError(data.error || "Preview failed");
      } else {
        setPreviewData(data.preview);
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setRunError("");
    setConfirming(false);
    setPreviewData(null);
    try {
      const res = await fetch("/api/disk-cleaner/run", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setRunError(data.error || "Cleanup failed");
      }
      await fetchData();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  // Category breakdown for last run
  const categoryBreakdown = lastRun
    ? buildCategoryBreakdown(lastRun.items_cleaned)
    : {};

  const maxCategorySize = Math.max(
    ...Object.values(categoryBreakdown).map((c) => c.sizeMb),
    1
  );

  // Preview category breakdown
  const previewBreakdown = previewData
    ? buildCategoryBreakdown(previewData.items_cleaned)
    : {};
  const maxPreviewCategorySize = Math.max(
    ...Object.values(previewBreakdown).map((c) => c.sizeMb),
    1
  );

  // History chart: reversed so newest is on the right
  const chartRuns = [...history].reverse();
  const maxHistoryBytes = Math.max(...chartRuns.map((r) => r.bytes_freed), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-cm-purple" />
      </div>
    );
  }

  // Disk gauge colors
  const freePercent = diskStats ? 100 - diskStats.percentUsed : 0;
  const gaugeColor =
    freePercent > 25
      ? "bg-dark-success"
      : freePercent > 15
      ? "bg-dark-warn"
      : "bg-dark-danger";
  const gaugeBg =
    freePercent > 25
      ? "bg-dark-success/20"
      : freePercent > 15
      ? "bg-yellow-100"
      : "bg-dark-danger/20";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-cm-purple" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-dark-text">Disk Cleaner</h1>
              <p className="text-sm text-dark-muted">
                Disk cleanup agent — caches, logs, trash, npm, brew
              </p>

            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!confirming && (
              <button
                onClick={handlePreview}
                disabled={previewing || running}
                className="flex items-center gap-2 px-4 py-2.5 bg-cm-purple/15 text-cm-purple rounded-lg font-medium hover:bg-cm-purple-light disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {previewing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Preview
                  </>
                )}
              </button>
            )}
            {confirming ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunNow}
                  className="flex items-center gap-2 px-4 py-2.5 bg-cm-purple text-white rounded-lg font-medium hover:bg-cm-purple/80 transition-colors"
                >
                  Yes, Clean
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-dark-panel2 text-dark-text rounded-lg font-medium hover:bg-dark-panel2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                disabled={running}
                className="flex items-center gap-2 px-5 py-2.5 bg-cm-purple text-white rounded-lg font-medium hover:bg-cm-purple/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {running ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Run Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {runError && (
        <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 text-sm">{runError}</p>
        </div>
      )}

      {/* Preview Results Panel */}
      {previewData && (
        <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-dark-warn/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-dark-warn" />
              <h3 className="font-semibold text-dark-text">
                Preview — What Would Be Cleaned
              </h3>
              <span className="text-xs bg-dark-warn/30 text-dark-warn px-2 py-0.5 rounded-full font-medium">
                Not deleted yet
              </span>
            </div>
            <button
              onClick={() => setPreviewData(null)}
              className="p-1 rounded hover:bg-dark-warn/20 transition-colors"
              title="Dismiss preview"
            >
              <XIcon className="w-4 h-4 text-dark-warn" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Preview summary */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-dark-muted">Would free:</span>{" "}
                <span className="font-semibold text-dark-warn">
                  {formatBytes(previewData.bytes_freed)}
                </span>
              </div>
              <div>
                <span className="text-dark-muted">Items:</span>{" "}
                <span className="font-semibold text-dark-text">
                  {previewData.items_cleaned.length}
                </span>
              </div>
              <div>
                <span className="text-dark-muted">Scan took:</span>{" "}
                <span className="font-semibold text-dark-text">
                  {(previewData.duration_ms / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Preview category breakdown */}
            {Object.keys(previewBreakdown).length > 0 && (
              <div className="space-y-2">
                {Object.entries(previewBreakdown)
                  .sort(([, a], [, b]) => b.sizeMb - a.sizeMb)
                  .map(([cat, data]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-dark-text font-medium">{cat}</span>
                        <span className="text-dark-muted">
                          {data.sizeMb.toFixed(1)} MB ({data.count} items)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-dark-warn/20 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-dark-warn transition-all duration-300"
                          style={{
                            width: `${Math.max(
                              (data.sizeMb / maxPreviewCategorySize) * 100,
                              2
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Preview items table */}
            {previewData.items_cleaned.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded border border-dark-warn/30">
                <table className="w-full">
                  <thead className="bg-dark-warn/20 text-xs text-dark-muted uppercase sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-1.5">Path</th>
                      <th className="text-right px-3 py-1.5">Size</th>
                      <th className="text-left px-3 py-1.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {previewData.items_cleaned.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-dark-warn/20 hover:bg-dark-warn/20/50 transition-colors"
                      >
                        <td className="px-3 py-1.5 font-mono text-xs text-dark-text truncate max-w-xs">
                          {item.path}
                        </td>
                        <td className="px-3 py-1.5 text-right text-dark-muted whitespace-nowrap">
                          {item.size_mb.toFixed(2)} MB
                        </td>
                        <td className="px-3 py-1.5 text-dark-muted">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Clean Now button in preview */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRunNow}
                disabled={running}
                className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg font-medium hover:bg-[#5b4fa8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {running ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Clean Now
                  </>
                )}
              </button>
              <button
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 text-dark-muted hover:text-dark-text transition-colors text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disk Gauge */}
      {diskStats && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-5">
          <div className="flex items-center gap-2 text-sm text-dark-muted mb-3">
            <HardDrive className="w-4 h-4" />
            <span className="font-medium text-dark-text">Disk Usage</span>
            <span className="ml-auto text-xs text-dark-muted">
              /System/Volumes/Data
            </span>
          </div>
          <div className="flex items-end gap-4 mb-2">
            <span className="text-3xl font-bold text-dark-text">
              {formatGb(diskStats.freeBytes)} GB
            </span>
            <span className="text-sm text-dark-muted pb-1">
              free of {formatGb(diskStats.totalBytes)} GB
            </span>
          </div>
          <div className={`w-full h-4 rounded-full ${gaugeBg} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${gaugeColor} transition-all duration-500`}
              style={{ width: `${diskStats.percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-dark-muted mt-1">
            <span>{formatGb(diskStats.usedBytes)} GB used</span>
            <span>{diskStats.percentUsed}% full</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {lifetimeStats && lifetimeStats.totalBytesFreed > 0 && (
          <div className="md:col-span-4 bg-gradient-to-r from-cm-purple/15 via-dark-panel to-dark-panel rounded-lg border border-dark-border p-4 flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-cm-purple flex-shrink-0" />
            <div>
              <p className="text-xs text-dark-muted uppercase tracking-wide font-medium">All-Time Freed</p>
              <p className="text-2xl font-bold text-cm-purple">{formatBytes(lifetimeStats.totalBytesFreed)}</p>
            </div>
            <div className="ml-6 pl-6 border-l border-dark-border">
              <p className="text-xs text-dark-muted">Total runs</p>
              <p className="text-lg font-semibold text-dark-text">{lifetimeStats.totalRuns}</p>
            </div>
            {lifetimeStats.firstRun && (
              <div className="ml-6 pl-6 border-l border-dark-border">
                <p className="text-xs text-dark-muted">Tracking since</p>
                <p className="text-sm font-medium text-dark-text">{new Date(lifetimeStats.firstRun).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Per-Run Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
            <Clock className="w-4 h-4" />
            Last Run
          </div>
          <p className="text-lg font-semibold text-dark-text">
            {lastRun ? formatRelativeTime(lastRun.timestamp) : "Never"}
          </p>
          {lastRun && (
            <p className="text-xs text-dark-muted mt-0.5">
              {new Date(lastRun.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
            <HardDrive className="w-4 h-4" />
            Space Freed
          </div>
          <p className="text-lg font-semibold text-cm-purple">
            {lastRun ? formatBytes(lastRun.bytes_freed) : "--"}
          </p>
        </div>

        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
            <Trash2 className="w-4 h-4" />
            Items Cleaned
          </div>
          <p className="text-lg font-semibold text-dark-text">
            {lastRun ? lastRun.items_cleaned.length : "--"}
          </p>
        </div>

        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
            <Clock className="w-4 h-4" />
            Next Run
          </div>
          <p className="text-lg font-semibold text-dark-text">
            {status?.nextRun
              ? new Date(status.nextRun).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "--"}
          </p>
          {status?.nextRun && (
            <p className="text-xs text-dark-muted mt-0.5">Sunday 3:00 AM</p>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {lastRun && Object.keys(categoryBreakdown).length > 0 && (
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cm-purple" />
              Category Breakdown
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b.sizeMb - a.sizeMb)
              .map(([cat, data]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-text font-medium">{cat}</span>
                    <span className="text-dark-muted">
                      {data.sizeMb.toFixed(1)} MB ({data.count} items)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-cm-purple/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cm-purple transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          (data.sizeMb / maxCategorySize) * 100,
                          2
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Run History Chart */}
      {chartRuns.length > 1 && (
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cm-purple" />
              Run History (last {chartRuns.length} runs)
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-end gap-2 h-40">
              {chartRuns.map((run, idx) => {
                const heightPct = Math.max(
                  (run.bytes_freed / maxHistoryBytes) * 100,
                  3
                );
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-dark-muted">
                      {formatBytes(run.bytes_freed)}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: "120px" }}>
                      <div
                        className="w-full max-w-[40px] rounded-t bg-cm-purple hover:bg-cm-purple/80 transition-colors cursor-default"
                        style={{ height: `${heightPct}%` }}
                        title={`${formatBytes(run.bytes_freed)} freed on ${new Date(run.timestamp).toLocaleString()}${run.disk_free_bytes ? ` | ${formatGb(run.disk_free_bytes)} GB free after` : ""}`}
                      />
                    </div>
                    <span className="text-[10px] text-dark-muted">
                      {formatShortDate(run.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4 flex items-center gap-3">
          {status.status === "ok" ? (
            <CheckCircle className="w-5 h-5 text-dark-success flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          )}
          <p className="text-sm text-dark-text">{status.summary}</p>
        </div>
      )}

      {/* Errors */}
      {lastRun && lastRun.errors.length > 0 && (
        <div className="bg-cm-pink-light rounded-lg border border-cm-pink p-4">
          <h3 className="font-semibold text-dark-text mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#9b5b5e]" />
            Errors ({lastRun.errors.length})
          </h3>
          <ul className="space-y-1 text-sm text-dark-text">
            {lastRun.errors.map((err, idx) => (
              <li key={idx} className="font-mono text-xs bg-dark-panel/60 rounded px-2 py-1">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cleaned Items */}
      {lastRun && lastRun.items_cleaned.length > 0 && (
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cm-purple" />
              Cleaned Items
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-dark-panel2 text-xs text-dark-muted uppercase sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Path</th>
                  <th className="text-right px-4 py-2">Size</th>
                  <th className="text-left px-4 py-2">Reason</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {lastRun.items_cleaned.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-dark-border hover:bg-dark-panel2/50 transition-colors"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-dark-text truncate max-w-xs">
                      {item.path}
                    </td>
                    <td className="px-4 py-2 text-right text-dark-muted whitespace-nowrap">
                      {item.size_mb.toFixed(2)} MB
                    </td>
                    <td className="px-4 py-2 text-dark-muted">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Browser Cache Panel ── */}
      {browserCaches && (
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel flex items-center justify-between">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <Globe className="w-4 h-4 text-cm-purple" />
              Browser Caches
            </h3>
            <span className="text-xs text-dark-muted">
              {Object.values(browserCaches).reduce((s, b) => s + (b.sizeMb || 0), 0).toFixed(0)} MB total
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(browserCaches).map(([browser, data]) => (
              <div key={browser} className="bg-dark-panel2 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-dark-muted capitalize mb-1">{browser}</p>
                <p className={`text-lg font-bold ${(data.sizeMb || 0) > 200 ? "text-cm-purple" : "text-dark-text"}`}>
                  {(data.sizeMb || 0) < 1 ? "<1" : (data.sizeMb || 0).toFixed(0)} MB
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dev Artifacts Panel ── */}
      {devArtifacts !== null && (
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel flex items-center justify-between">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cm-purple" />
              Dev Artifacts
            </h3>
            <span className="text-xs text-dark-muted">
              {devArtifacts.length === 0 ? "none found" : `${devArtifacts.length} found · ${devArtifacts.reduce((s, a) => s + a.size_mb, 0).toFixed(0)} MB`}
            </span>
          </div>
          {devArtifacts.length === 0 ? (
            <p className="p-4 text-sm text-dark-muted">No stale dev artifacts found (node_modules, .venv, target/, etc.)</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-dark-panel2 text-xs text-dark-muted uppercase sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2">Path</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-right px-4 py-2">Size</th>
                    <th className="text-right px-4 py-2">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {devArtifacts.map((a, i) => (
                    <tr key={i} className="border-t border-dark-border hover:bg-dark-panel2/50">
                      <td className="px-4 py-1.5 font-mono text-xs text-dark-text truncate max-w-xs">{a.path}</td>
                      <td className="px-4 py-1.5 text-dark-muted">{a.type}</td>
                      <td className="px-4 py-1.5 text-right text-dark-muted">{a.size_mb.toFixed(0)} MB</td>
                      <td className="px-4 py-1.5 text-right text-dark-muted">{a.ageDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Large Files Panel ── */}
      <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
        <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel flex items-center justify-between">
          <h3 className="font-semibold text-dark-text flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-cm-purple" />
            Space Hogs (files &gt; 200 MB)
          </h3>
          <button
            onClick={fetchLargeFiles}
            disabled={largeFilesLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-md font-medium hover:bg-cm-purple-light disabled:opacity-60 transition-colors"
          >
            {largeFilesLoading ? <Loader className="w-3 h-3 animate-spin" /> : <FileSearch className="w-3 h-3" />}
            {largeFiles === null ? "Scan Now" : "Re-scan"}
          </button>
        </div>
        {largeFiles === null ? (
          <p className="p-4 text-sm text-dark-muted">Click &quot;Scan Now&quot; to find large files hidden on your disk.</p>
        ) : largeFiles.length === 0 ? (
          <p className="p-4 text-sm text-dark-muted">No files over 200 MB found in common directories.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-panel2 text-xs text-dark-muted uppercase sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Path</th>
                  <th className="text-right px-4 py-2">Size</th>
                  <th className="text-right px-4 py-2">Modified</th>
                </tr>
              </thead>
              <tbody>
                {largeFiles.slice(0, 30).map((f, i) => (
                  <tr key={i} className="border-t border-dark-border hover:bg-dark-panel2/50">
                    <td className="px-4 py-1.5 font-mono text-xs text-dark-text truncate max-w-sm">{f.path}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-cm-purple">{f.size_mb >= 1024 ? `${(f.size_mb/1024).toFixed(1)} GB` : `${f.size_mb.toFixed(0)} MB`}</td>
                    <td className="px-4 py-1.5 text-right text-dark-muted text-xs">{new Date(f.modified).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── System Tune-Up Panel ── */}
      {systemTuneup && (
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cm-purple" />
              System Tune-Up
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* RAM */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-dark-muted uppercase tracking-wide flex items-center gap-1">
                <Zap className="w-3 h-3" /> Memory
              </p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-dark-text">{systemTuneup.memory.freeGb.toFixed(1)}</span>
                <span className="text-sm text-dark-muted pb-0.5">GB free of {systemTuneup.memory.totalGb.toFixed(0)} GB</span>
              </div>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                systemTuneup.memory.pressureLevel === "normal" ? "bg-dark-success/20 text-dark-success" :
                systemTuneup.memory.pressureLevel === "warn" ? "bg-dark-warn/20 text-dark-warn" :
                "bg-dark-danger/20 text-dark-danger"
              }`}>{systemTuneup.memory.pressureLevel} pressure</span>
            </div>

            {/* DNS */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-dark-muted uppercase tracking-wide flex items-center gap-1">
                <Globe className="w-3 h-3" /> DNS Cache
              </p>
              <p className="text-sm text-dark-muted">Flush to fix DNS resolution issues</p>
              <button
                onClick={handleFlushDNS}
                disabled={dnsFlushStatus === "flushing"}
                className="flex items-center gap-2 px-3 py-1.5 bg-cm-purple text-white text-sm rounded-lg font-medium hover:bg-cm-purple/80 disabled:opacity-60 transition-colors"
              >
                {dnsFlushStatus === "flushing" ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {dnsFlushStatus === "done" ? "Flushed!" : dnsFlushStatus === "error" ? "Failed" : "Flush DNS"}
              </button>
            </div>

            {/* iOS Backups */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-dark-muted uppercase tracking-wide flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> iOS Backups
              </p>
              {systemTuneup.iosBackups.count === 0 ? (
                <p className="text-sm text-dark-muted">No iPhone/iPad backups found</p>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-dark-text">{systemTuneup.iosBackups.count}</span>
                    <span className="text-sm text-dark-muted pb-0.5">backups · {(systemTuneup.iosBackups.totalSizeMb / 1024).toFixed(1)} GB</span>
                  </div>
                  <p className="text-xs text-dark-muted">Old backups (90d+) cleaned automatically on next run</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No data state */}
      {!lastRun && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-12 text-center">
          <Sparkles className="w-12 h-12 text-cm-purple-mid mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-text mb-1">
            No cleanup data yet
          </h3>
          <p className="text-sm text-dark-muted">
            Click &quot;Run Now&quot; to perform your first disk cleanup.
          </p>
        </div>
      )}
    </div>
  );
}
