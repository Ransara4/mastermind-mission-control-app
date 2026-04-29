"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ArrowRightLeft,
  Play,
  FileText,
  Shield,
  Ban,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Save,
} from "lucide-react";

interface Manifest {
  version: number;
  lastSyncCommit: string;
  source: string;
  dest: string;
  routeRenames: Record<string, string>;
  textReplacements: Record<string, string>;
  labelRenames: Record<string, string>;
  skipPaths: string[];
  protectedFiles: string[];
  binaryExtensions: string[];
}

interface SyncStatus {
  manifest: Manifest;
  currentHead: string;
  pendingChanges: number;
  isSynced: boolean;
  report: string | null;
  reportDate: string | null;
}

export default function SmartSyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingManifest, setEditingManifest] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    actions: true,
    renames: false,
    skipPaths: false,
    protected: false,
    report: false,
  });

  // Editable state
  const [editSkipPaths, setEditSkipPaths] = useState<string[]>([]);
  const [editProtected, setEditProtected] = useState<string[]>([]);
  const [editRenames, setEditRenames] = useState<Record<string, string>>({});
  const [newSkipPath, setNewSkipPath] = useState("");
  const [newProtectedFile, setNewProtectedFile] = useState("");
  const [newRenameFrom, setNewRenameFrom] = useState("");
  const [newRenameTo, setNewRenameTo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/smart-sync");
      if (!res.ok) throw new Error("Failed to fetch sync status");
      const data = await res.json();
      setStatus(data);
      setEditSkipPaths(data.manifest.skipPaths || []);
      setEditProtected(data.manifest.protectedFiles || []);
      setEditRenames(data.manifest.routeRenames || {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const runAction = async (action: string) => {
    setRunning(action);
    setOutput(null);
    try {
      const res = await fetch("/api/smart-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setOutput(data.output);
        await fetchStatus();
      } else {
        setError(data.error || "Sync failed");
        setOutput(data.stdout || data.stderr || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(null);
    }
  };

  const saveManifest = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/smart-sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skipPaths: editSkipPaths,
          protectedFiles: editProtected,
          routeRenames: editRenames,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingManifest(false);
        await fetchStatus();
      } else {
        setError(data.error || "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading sync status...</p>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold text-dark-text mb-2">Sync Error</h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={fetchStatus}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) return null;

  const { manifest, currentHead, pendingChanges, isSynced } = status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cm-purple/15 rounded-lg">
            <ArrowRightLeft className="text-cm-purple" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">
              SmartSync
            </h1>
            <p className="text-sm text-dark-muted">
              OpenClaw → GoldenClaw sync engine
            </p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-1.5 text-dark-muted hover:text-dark-text transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Status Card */}
      <SectionCard
        title="Sync Status"
        icon={<GitBranch size={16} className="text-cm-purple" />}
        sectionKey="status"
        expanded={expandedSections.status}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
            <p className="text-xs text-dark-muted mb-1">Last Sync</p>
            <p className="text-sm font-mono text-dark-text">
              {manifest.lastSyncCommit.slice(0, 7)}
            </p>
          </div>
          <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
            <p className="text-xs text-dark-muted mb-1">Current HEAD</p>
            <p className="text-sm font-mono text-dark-text">
              {currentHead?.slice(0, 7) || "unknown"}
            </p>
          </div>
          <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
            <p className="text-xs text-dark-muted mb-1">Pending Changes</p>
            <div className="flex items-center gap-2">
              {isSynced ? (
                <CheckCircle2 size={16} className="text-dark-success" />
              ) : (
                <AlertTriangle size={16} className="text-dark-warn" />
              )}
              <p className="text-sm font-mono text-dark-text">
                {pendingChanges} file{pendingChanges !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-dark-muted">
          <div>
            Route renames:{" "}
            <span className="text-dark-text">{Object.keys(manifest.routeRenames).length}</span>
          </div>
          <div>
            Skip patterns:{" "}
            <span className="text-dark-text">{manifest.skipPaths.length}</span>
          </div>
          <div>
            Protected files:{" "}
            <span className="text-dark-text">{manifest.protectedFiles.length}</span>
          </div>
        </div>
      </SectionCard>

      {/* Actions */}
      <SectionCard
        title="Actions"
        icon={<Play size={16} className="text-cm-purple" />}
        sectionKey="actions"
        expanded={expandedSections.actions}
        onToggle={toggleSection}
      >
        <div className="flex flex-wrap gap-3">
          <ActionButton
            label="Generate Report"
            description="Dry run — see what would sync"
            icon={<FileText size={16} />}
            onClick={() => runAction("report")}
            loading={running === "report"}
            disabled={!!running || isSynced}
          />
          <ActionButton
            label="Apply Safe Changes"
            description="Sync non-protected files"
            icon={<Play size={16} />}
            onClick={() => runAction("apply")}
            loading={running === "apply"}
            disabled={!!running || isSynced}
            primary
          />
          <ActionButton
            label="Apply + Generate Diffs"
            description="Sync + diffs for protected files"
            icon={<FileText size={16} />}
            onClick={() => runAction("apply-all")}
            loading={running === "apply-all"}
            disabled={!!running || isSynced}
          />
        </div>

        {output && (
          <div className="mt-4 bg-dark-panel2 border border-dark-border rounded-lg p-4">
            <p className="text-xs text-dark-muted mb-2">Output</p>
            <pre className="text-xs text-dark-text font-mono whitespace-pre-wrap overflow-x-auto">
              {output}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-4">
            <p className="text-xs text-dark-danger">{error}</p>
          </div>
        )}
      </SectionCard>

      {/* Route Renames */}
      <SectionCard
        title="Route Renames"
        icon={<ArrowRightLeft size={16} className="text-cm-purple" />}
        sectionKey="renames"
        expanded={expandedSections.renames}
        onToggle={toggleSection}
        badge={String(Object.keys(manifest.routeRenames).length)}
      >
        <div className="space-y-2">
          {Object.entries(editingManifest ? editRenames : manifest.routeRenames).map(
            ([from, to]) => (
              <div
                key={from}
                className="flex items-center gap-2 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2"
              >
                <code className="text-xs text-dark-text font-mono flex-1">{from}</code>
                <ArrowRightLeft size={12} className="text-dark-muted flex-shrink-0" />
                <code className="text-xs text-cm-purple font-mono flex-1">{to}</code>
                {editingManifest && (
                  <button
                    onClick={() => {
                      const copy = { ...editRenames };
                      delete copy[from];
                      setEditRenames(copy);
                    }}
                    className="text-dark-muted hover:text-dark-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          )}

          {editingManifest && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newRenameFrom}
                onChange={(e) => setNewRenameFrom(e.target.value)}
                placeholder="from-route"
                className="flex-1 px-2 py-1.5 text-xs bg-dark-panel2 border border-dark-border rounded text-dark-text font-mono"
              />
              <ArrowRightLeft size={12} className="text-dark-muted flex-shrink-0" />
              <input
                type="text"
                value={newRenameTo}
                onChange={(e) => setNewRenameTo(e.target.value)}
                placeholder="to-route"
                className="flex-1 px-2 py-1.5 text-xs bg-dark-panel2 border border-dark-border rounded text-dark-text font-mono"
              />
              <button
                onClick={() => {
                  if (newRenameFrom && newRenameTo) {
                    setEditRenames({ ...editRenames, [newRenameFrom]: newRenameTo });
                    setNewRenameFrom("");
                    setNewRenameTo("");
                  }
                }}
                className="p-1.5 text-cm-purple hover:bg-cm-purple/15 rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Skip Paths */}
      <SectionCard
        title="Skip Paths"
        icon={<Ban size={16} className="text-cm-purple" />}
        sectionKey="skipPaths"
        expanded={expandedSections.skipPaths}
        onToggle={toggleSection}
        badge={String(manifest.skipPaths.length)}
      >
        <p className="text-xs text-dark-muted mb-3">
          Files matching these patterns will never be synced from OpenClaw.
        </p>
        <div className="space-y-1.5">
          {(editingManifest ? editSkipPaths : manifest.skipPaths).map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-1.5"
            >
              <code className="text-xs text-dark-text font-mono flex-1">{p}</code>
              {editingManifest && (
                <button
                  onClick={() => setEditSkipPaths(editSkipPaths.filter((_, j) => j !== i))}
                  className="text-dark-muted hover:text-dark-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {editingManifest && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newSkipPath}
                onChange={(e) => setNewSkipPath(e.target.value)}
                placeholder="app/app/some-page/**"
                className="flex-1 px-2 py-1.5 text-xs bg-dark-panel2 border border-dark-border rounded text-dark-text font-mono"
              />
              <button
                onClick={() => {
                  if (newSkipPath) {
                    setEditSkipPaths([...editSkipPaths, newSkipPath]);
                    setNewSkipPath("");
                  }
                }}
                className="p-1.5 text-cm-purple hover:bg-cm-purple/15 rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Protected Files */}
      <SectionCard
        title="Protected Files"
        icon={<Shield size={16} className="text-cm-purple" />}
        sectionKey="protected"
        expanded={expandedSections.protected}
        onToggle={toggleSection}
        badge={String(manifest.protectedFiles.length)}
      >
        <p className="text-xs text-dark-muted mb-3">
          These files are never auto-synced — they generate diffs for manual review instead.
        </p>
        <div className="space-y-1.5">
          {(editingManifest ? editProtected : manifest.protectedFiles).map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-1.5"
            >
              <code className="text-xs text-dark-text font-mono flex-1">{p}</code>
              {editingManifest && (
                <button
                  onClick={() => setEditProtected(editProtected.filter((_, j) => j !== i))}
                  className="text-dark-muted hover:text-dark-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {editingManifest && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newProtectedFile}
                onChange={(e) => setNewProtectedFile(e.target.value)}
                placeholder="app/app/layout.tsx"
                className="flex-1 px-2 py-1.5 text-xs bg-dark-panel2 border border-dark-border rounded text-dark-text font-mono"
              />
              <button
                onClick={() => {
                  if (newProtectedFile) {
                    setEditProtected([...editProtected, newProtectedFile]);
                    setNewProtectedFile("");
                  }
                }}
                className="p-1.5 text-cm-purple hover:bg-cm-purple/15 rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Edit Controls */}
      <div className="flex items-center gap-3">
        {editingManifest ? (
          <>
            <button
              onClick={saveManifest}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Changes
            </button>
            <button
              onClick={() => {
                setEditingManifest(false);
                setEditSkipPaths(manifest.skipPaths);
                setEditProtected(manifest.protectedFiles);
                setEditRenames(manifest.routeRenames);
              }}
              className="px-4 py-2 bg-dark-panel2 border border-dark-border text-dark-muted rounded-lg hover:text-dark-text transition-colors text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditingManifest(true)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-panel2 border border-dark-border text-dark-muted rounded-lg hover:text-dark-text transition-colors text-sm"
          >
            Edit Sync Rules
          </button>
        )}
      </div>

      {/* Latest Report */}
      <SectionCard
        title="Latest Report"
        icon={<FileText size={16} className="text-cm-purple" />}
        sectionKey="report"
        expanded={expandedSections.report}
        onToggle={toggleSection}
      >
        {status.report ? (
          <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
            <p className="text-xs text-dark-muted mb-3">
              Generated: {status.reportDate ? new Date(status.reportDate).toLocaleString() : "unknown"}
            </p>
            <pre className="text-xs text-dark-text font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
              {status.report}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-dark-muted">
            No report generated yet. Click &quot;Generate Report&quot; to see what would sync.
          </p>
        )}
      </SectionCard>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  sectionKey,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center gap-3 p-4 hover:bg-dark-panel2/50 transition-colors"
      >
        {icon}
        <span className="text-sm font-semibold text-dark-text flex-1 text-left">
          {title}
        </span>
        {badge && (
          <span className="px-2 py-0.5 text-xs bg-cm-purple/15 text-cm-purple rounded-full">
            {badge}
          </span>
        )}
        {expanded ? (
          <ChevronDown size={16} className="text-dark-muted" />
        ) : (
          <ChevronRight size={16} className="text-dark-muted" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ActionButton({
  label,
  description,
  icon,
  onClick,
  loading,
  disabled,
  primary,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-left ${
        primary
          ? "bg-cm-purple text-white hover:bg-cm-purple/80"
          : "bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
      }`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xs ${primary ? "text-white/70" : "text-dark-muted"}`}>
          {description}
        </p>
      </div>
    </button>
  );
}
