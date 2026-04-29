"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
import {
  ArrowLeft,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Loader2,
  Save,
  Pencil,
  Eye,
  Search,
  X,
  BarChart2,
  Clock,
  Zap,
  Filter,
  RefreshCw,
} from "lucide-react";

import AiAnswerPanel from "./AiAnswerPanel";
import ScreenshotUpload from "./ScreenshotUpload";

// ── Types ─────────────────────────────────────────────────────────

const WABA_ROOT = `${process.env.NEXT_PUBLIC_GC_WORKSPACE || "/Users/openclaw/golden-claw"}/projects/rio/waba-setup`;

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  size?: number;
}

interface FileContent {
  path: string;
  name: string;
  content: string;
  extension: string;
  isEditable: boolean;
  size: number;
}

interface SearchResult {
  id: number;
  file_path: string;
  heading: string;
  content: string;
  stage: string;
  topics: string[];
  score: number;
  search_mode?: string;
}

interface KbStats {
  total: number;
  exists: number;
  planned: number;
  coverage_pct: number;
  by_stage: Record<string, { exists: number; planned: number }>;
  index_available: boolean;
  last_updated: string;
  total_searches: number;
  most_searched: Array<{ query: string; count: number }>;
}

interface HistoryEntry {
  query: string;
  timestamp: string;
  results_count: number;
  mode?: string;
}

// ── Helpers ───────────────────────────────────────────────────────

function getFileIcon(node: FileTreeNode): React.ReactNode {
  if (node.type === "directory") {
    const name = node.name.toLowerCase();
    if (name === "errors") return <AlertTriangle size={14} className="text-dark-warn flex-shrink-0" />;
    if (name === "competitor-docs") return <ExternalLink size={14} className="text-cm-purple flex-shrink-0" />;
    return <Folder size={14} className="text-cm-purple flex-shrink-0" />;
  }
  return <FileText size={14} className="text-dark-muted flex-shrink-0" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    "pre-setup": "Pre-Setup",
    "waba-creation": "WABA Creation",
    "number-registration": "Number Registration",
    "display-name": "Display Name",
    "business-verification": "Business Verification",
    "security": "Security",
    "coexistence": "Coexistence",
    "partner-management": "Partner Mgmt",
    "triage": "Triage",
    "errors": "Error Ref",
    "competitor-reference": "Competitor Docs",
  };
  return map[stage] || stage;
}

function scoreColor(score: number): string {
  if (score >= 10) return "bg-dark-success/20 text-dark-success";
  if (score >= 5) return "bg-dark-warn/20 text-dark-warn";
  return "bg-dark-panel2 text-dark-muted";
}

// Slugify a heading for use as an anchor
function headingToId(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Custom Markdown heading renderer (adds id for anchor scrolling) ──

function HeadingWithId({ level, children }: { level: number; children: React.ReactNode }) {
  const text = typeof children === "string" ? children : "";
  const id = headingToId(text);
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  return <Tag id={id}>{children}</Tag>;
}

// ── File tree node component ──────────────────────────────────────

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = node.path === selectedPath;

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className="w-full flex items-center gap-2 py-1.5 pr-2 rounded-lg text-sm text-dark-muted hover:bg-cm-purple/10 hover:text-cm-purple transition-colors"
        >
          {open ? (
            <ChevronDown size={12} className="flex-shrink-0 text-dark-muted" />
          ) : (
            <ChevronRight size={12} className="flex-shrink-0 text-dark-muted" />
          )}
          {getFileIcon(node)}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
            {node.children.length === 0 && (
              <p
                style={{ paddingLeft: `${(depth + 1) * 12 + 20}px` }}
                className="py-1.5 text-xs text-dark-muted italic"
              >
                Empty folder
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      className={`w-full flex items-center gap-2 py-1.5 pr-2 rounded-lg text-sm transition-colors ${
        isSelected
          ? "bg-cm-purple/15 text-cm-purple font-medium"
          : "text-dark-muted hover:bg-cm-purple/10 hover:text-cm-purple"
      }`}
    >
      {getFileIcon(node)}
      <span className="truncate text-left">{node.name}</span>
      {node.size !== undefined && (
        <span className="ml-auto text-xs text-dark-muted flex-shrink-0">{formatBytes(node.size)}</span>
      )}
    </button>
  );
}

// ── Search Result component ──────────────────────────────────────

function extractSection(fileContent: string, heading: string): { section: string; start: number; end: number } | null {
  const lines = fileContent.split("\n");
  let startIdx = -1;
  let headingLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match && match[2].trim() === heading.trim()) {
      startIdx = i;
      headingLevel = match[1].length;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s/);
    if (match && match[1].length <= headingLevel) {
      endIdx = i;
      break;
    }
  }

  const section = lines.slice(startIdx, endIdx).join("\n");
  return { section, start: startIdx, end: endIdx };
}

function SearchResultCard({
  result,
  onViewFull,
  onSaved,
}: {
  result: SearchResult;
  onViewFull: (filePath: string, anchor?: string) => void;
  onSaved?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaved, setEditSaved] = useState(false);
  const preview = result.content.slice(0, 250).replace(/\n/g, " ");
  const hasMore = result.content.length > 250;
  const anchor = headingToId(result.heading);

  const handleEnterEdit = async () => {
    setEditError(null);
    setEditSaved(false);
    const fullPath = `${WABA_ROOT}/${result.file_path}`;
    try {
      const res = await fetch(`/api/repo/file?path=${encodeURIComponent(fullPath)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const extracted = extractSection(data.content, result.heading);
      setEditContent(extracted ? extracted.section : result.content);
    } catch {
      setEditContent(result.content);
    }
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    setEditError(null);
    const fullPath = `${WABA_ROOT}/${result.file_path}`;
    try {
      const res = await fetch(`/api/repo/file?path=${encodeURIComponent(fullPath)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const extracted = extractSection(data.content, result.heading);
      let newFileContent: string;
      if (extracted) {
        const lines = data.content.split("\n");
        const before = lines.slice(0, extracted.start).join("\n");
        const after = lines.slice(extracted.end).join("\n");
        newFileContent = [before, editContent, after].filter((s) => s !== "").join("\n");
      } else {
        newFileContent = data.content.replace(result.content, editContent);
      }

      const saveRes = await fetch("/api/repo/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fullPath, content: newFileContent }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error ?? "Save failed");

      setEditSaved(true);
      setEditing(false);
      onSaved?.();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="border border-dark-border rounded-lg p-3 hover:border-cm-purple transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-dark-text truncate">{result.heading}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-dark-muted font-mono font-dm-mono truncate">{result.file_path}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${scoreColor(result.score)}`}>
              {result.score.toFixed(1)}
            </span>
            {result.search_mode && result.search_mode !== "keyword" && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-cm-purple/15 text-cm-purple">
                {result.search_mode}
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-md flex-shrink-0 ${
          result.stage === "errors"
            ? "bg-dark-warn/20 text-dark-warn"
            : "bg-cm-purple/15 text-cm-purple"
        }`}>
          {stageLabel(result.stage)}
        </span>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg p-3 text-sm text-dark-text font-mono resize-y focus:outline-none focus:border-cm-purple"
            rows={12}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            aria-label="Edit section content"
          />
          {editError && <p className="text-xs text-dark-danger">{editError}</p>}
          {editSaved && <p className="text-xs text-dark-success">Saved</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cm-purple text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {editSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {editSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setEditError(null); }}
              className="text-xs text-dark-muted hover:text-dark-text"
            >
              Cancel
            </button>
            <span className="text-xs text-dark-muted ml-auto font-mono">{result.file_path}</span>
          </div>
        </div>
      ) : (
        <>
          {expanded ? (
            <div className="mt-2 prose prose-sm prose-invert max-w-none prose-headings:text-dark-text prose-a:text-cm-purple prose-code:text-cm-purple prose-code:bg-cm-purple/10 prose-code:px-1 prose-code:rounded text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-dark-muted mt-1 line-clamp-3">
              {preview}{hasMore && "..."}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-cm-purple hover:underline"
              >
                {expanded ? "Collapse" : "Show full"}
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleEnterEdit}
                className="text-xs text-dark-muted hover:text-cm-purple flex items-center gap-1"
                title="Edit this section"
              >
                <Pencil size={11} />
                Edit
              </button>
              <button
                onClick={() => onViewFull(`${WABA_ROOT}/${result.file_path}`, anchor)}
                className="text-xs text-dark-muted hover:text-cm-purple hover:underline"
              >
                Open file →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── KB Stats panel ────────────────────────────────────────────────

function KbStatsPanel({ stats }: { stats: KbStats }) {
  return (
    <div className="space-y-4">
      {/* Coverage summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-cm-purple">{stats.exists}</div>
          <div className="text-xs text-dark-muted mt-0.5">Files ready</div>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-dark-warn">{stats.planned}</div>
          <div className="text-xs text-dark-muted mt-0.5">Planned</div>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-dark-text">{stats.coverage_pct}%</div>
          <div className="text-xs text-dark-muted mt-0.5">Coverage</div>
        </div>
      </div>

      {/* Coverage bar */}
      <div>
        <div className="flex justify-between text-xs text-dark-muted mb-1">
          <span>Coverage</span>
          <span>{stats.exists}/{stats.total} files</span>
        </div>
        <div className="h-2 bg-dark-panel2 rounded-full overflow-hidden">
          <div
            className="h-full bg-cm-purple rounded-full transition-all"
            style={{ width: `${stats.coverage_pct}%` }}
          />
        </div>
      </div>

      {/* By stage */}
      <div>
        <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-2">By Stage</h3>
        <div className="space-y-1.5">
          {Object.entries(stats.by_stage).map(([stage, counts]) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="text-xs text-dark-muted w-36 flex-shrink-0">{stageLabel(stage)}</span>
              <div className="flex-1 h-1.5 bg-dark-panel2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cm-purple rounded-full"
                  style={{
                    width: `${Math.round((counts.exists / (counts.exists + counts.planned)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-dark-muted w-8 text-right flex-shrink-0">
                {counts.exists}/{counts.exists + counts.planned}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Search stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-cm-purple/10 rounded-xl p-3">
          <div className="text-lg font-bold text-cm-purple">{stats.total_searches}</div>
          <div className="text-xs text-dark-muted">Total searches</div>
        </div>
        <div className={`rounded-xl p-3 ${stats.index_available ? "bg-dark-success/10" : "bg-dark-warn/10"}`}>
          <div className={`text-sm font-semibold ${stats.index_available ? "text-dark-success" : "text-dark-warn"}`}>
            {stats.index_available ? "Semantic ✓" : "Keyword only"}
          </div>
          <div className="text-xs text-dark-muted">Search mode</div>
        </div>
      </div>

      {/* Top queries */}
      {stats.most_searched.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-2">Top Searches</h3>
          <div className="space-y-1">
            {stats.most_searched.map((item) => (
              <div key={item.query} className="flex items-center justify-between text-xs">
                <span className="text-dark-muted truncate">&ldquo;{item.query}&rdquo;</span>
                <span className="text-dark-muted/60 ml-2 flex-shrink-0">×{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-dark-muted">Last updated: {stats.last_updated}</div>
    </div>
  );
}

// ── History panel ────────────────────────────────────────────────

function HistoryPanel({
  entries,
  onSearch,
}: {
  entries: HistoryEntry[];
  onSearch: (query: string) => void;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-dark-muted italic">No searches yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div key={idx} className="flex items-start justify-between gap-2">
          <button
            onClick={() => onSearch(entry.query)}
            className="text-xs text-cm-purple hover:underline text-left truncate flex-1"
          >
            {entry.query}
          </button>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-dark-muted">{entry.results_count}r</span>
            <span className="text-xs text-dark-muted/60">
              {new Date(entry.timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sidebar panel type ────────────────────────────────────────────

type SidePanel = "none" | "stats" | "history";

// ── Main Page ─────────────────────────────────────────────────────

export default function WabaSetupPage() {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [searchMode, setSearchMode] = useState("keyword");
  const [indexAvailable, setIndexAvailable] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Side panels
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [stats, setStats] = useState<KbStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Back navigation — track previous search so user can return from file view
  const [previousSearch, setPreviousSearch] = useState<{ query: string; results: SearchResult[] } | null>(null);

  // AI Answer state
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiStage, setAiStage] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<Array<{ file_path: string; heading: string; stage: string }>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Detected language from multi-language query translation
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  // Screenshot clear key — increment to reset ScreenshotUpload component
  const [screenshotClearKey, setScreenshotClearKey] = useState(0);
  const [screenshotStatus, setScreenshotStatus] = useState<{ state: string; description: string | null; previewUrl: string | null; errorMessage: string | null } | null>(null);

  // Index staleness after file save
  const [indexStale, setIndexStale] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Load directory tree
  useEffect(() => {
    setTreeLoading(true);
    setTreeError(null);
    fetch(`/api/repo/tree?path=${encodeURIComponent(WABA_ROOT)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTree(data.tree ?? []);
      })
      .catch((err) => setTreeError(err.message))
      .finally(() => setTreeLoading(false));
  }, []);

  // Cmd+K keyboard shortcut to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check index availability on mount
  useEffect(() => {
    fetch("/api/rio/waba-search/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.index_available) {
          setIndexAvailable(true);
          setSearchMode("hybrid");
        }
      })
      .catch(() => {});
  }, []);

  // Scroll to anchor after file loads
  useEffect(() => {
    if (!fileLoading && fileContent && pendingAnchor) {
      const anchor = pendingAnchor;
      setPendingAnchor(null);
      // Small delay to let ReactMarkdown render
      setTimeout(() => {
        const el = contentRef.current?.querySelector(`#${anchor}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [fileLoading, fileContent, pendingAnchor]);

  // Load file content
  const loadFile = useCallback((filePath: string, anchor?: string) => {
    setSelectedPath(filePath);
    if (anchor) setPendingAnchor(anchor);
    setFileLoading(true);
    setFileError(null);
    setFileContent(null);
    setEditMode(false);
    setSaveResult(null);
    // Save search state so user can go back
    if (showSearch && searchResults) {
      setPreviousSearch({ query: searchQuery, results: searchResults });
    }
    setShowSearch(false);

    fetch(`/api/repo/file?path=${encodeURIComponent(filePath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFileContent(data);
        setEditedContent(data.content);
      })
      .catch((err) => setFileError(err.message))
      .finally(() => setFileLoading(false));
  }, []);

  // Save file
  const handleSave = useCallback(async () => {
    if (!fileContent) return;
    setSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/repo/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fileContent.path, content: editedContent }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Save failed");

      setFileContent((prev) => (prev ? { ...prev, content: editedContent } : null));
      setSaveResult({ ok: true, message: "Saved" });
      setEditMode(false);
      setIndexStale(true);
    } catch (err) {
      setSaveResult({ ok: false, message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [fileContent, editedContent]);

  // Search
  const handleSearch = useCallback(async (
    queryOverride?: string,
    fromScreenshot?: boolean,
    screenshotAnalysis?: { errors: string[]; stage: string | null; description: string; error_codes?: string[] },
  ) => {
    const q = queryOverride ?? searchQuery;
    if (!q.trim()) return;
    if (queryOverride) setSearchQuery(queryOverride);

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);
    setShowSearch(true);
    // Clear screenshot when doing a fresh text search (not triggered by screenshot upload)
    if (!fromScreenshot) {
      setScreenshotClearKey((k) => k + 1);
    }
    setSelectedPath(null);
    setFileContent(null);

    const params = new URLSearchParams({ q, top_k: "8", mode: searchMode });
    if (stageFilter) params.set("stage", stageFilter);

    // Build answer params — includes screenshot context when available
    const answerParams = new URLSearchParams(params);
    if (screenshotAnalysis) {
      answerParams.set("context", JSON.stringify(screenshotAnalysis));
    }

    try {
      const res = await fetch(`/api/rio/waba-search?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSearchResults(data.results);
      setDetectedLanguage(data.detected_language ?? null);
      // Fire AI answer fetch in parallel (non-blocking)
      setAiLoading(true);
      setAiAnswer(null);
      setAiStage(null);
      setAiSources([]);
      setAiError(null);
      fetch(`/api/rio/waba-answer?${answerParams}`)
        .then((r) => r.json())
        .then((d) => {
          setAiAnswer(d.answer ?? null);
          setAiStage(d.stage ?? null);
          setAiSources(d.sources ?? []);
          if (d.error && !d.answer) setAiError(d.error);
        })
        .catch((e) => setAiError(e.message))
        .finally(() => setAiLoading(false));
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, searchMode, stageFilter]);

  // Load stats
  const loadStats = useCallback(() => {
    if (sidePanel === "stats") { setSidePanel("none"); return; }
    setSidePanel("stats");
    setStatsLoading(true);
    fetch("/api/rio/waba-search/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); if (d.index_available) setIndexAvailable(true); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [sidePanel]);

  // Load history
  const loadHistory = useCallback(() => {
    if (sidePanel === "history") { setSidePanel("none"); return; }
    setSidePanel("history");
    setHistoryLoading(true);
    fetch("/api/rio/waba-search/history?limit=30")
      .then((r) => r.json())
      .then((d) => setHistory(d.entries || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [sidePanel]);

  // Rebuild search index
  const handleRebuildIndex = useCallback(async () => {
    setRebuilding(true);
    setRebuildResult(null);
    try {
      const res = await fetch("/api/rio/waba-search/rebuild", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Rebuild failed");
      setIndexStale(false);
      setRebuilding(false);
      const msg = data.chunks ? `Index rebuilt — ${data.chunks} chunks` : "Index rebuilt";
      setRebuildResult({ ok: true, message: msg });
      setTimeout(() => setRebuildResult(null), 3000);
    } catch (err) {
      setRebuilding(false);
      setRebuildResult({ ok: false, message: (err as Error).message });
    }
  }, []);

  const relativePath = selectedPath ? selectedPath.replace(WABA_ROOT + "/", "") : null;

  const STAGE_OPTIONS = [
    { value: "", label: "All stages" },
    { value: "pre-setup", label: "Pre-Setup" },
    { value: "waba-creation", label: "WABA Creation" },
    { value: "number-registration", label: "Number Registration" },
    { value: "display-name", label: "Display Name" },
    { value: "business-verification", label: "Business Verification" },
    { value: "security", label: "Security" },
    { value: "coexistence", label: "Coexistence" },
    { value: "partner-management", label: "Partner Mgmt" },
    { value: "triage", label: "Triage" },
    { value: "errors", label: "Errors only" },
    { value: "competitor-reference", label: "Competitor Docs" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/app/rio"
            className="flex items-center gap-1.5 text-sm text-cm-purple hover:text-[#5b4fa8] transition-colors"
          >
            <ArrowLeft size={16} />
            Rio
          </Link>
          <span className="text-dark-muted">/</span>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-cm-purple" />
            <h1 className="text-xl font-bold tracking-tight text-dark-text">WABA Setup Knowledge Base</h1>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadHistory}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              sidePanel === "history"
                ? "bg-cm-purple text-white"
                : "bg-cm-purple/15 text-cm-purple hover:bg-cm-purple hover:text-white"
            }`}
          >
            <Clock size={14} />
            History
          </button>
          <button
            onClick={loadStats}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              sidePanel === "stats"
                ? "bg-cm-purple text-white"
                : "bg-cm-purple/15 text-cm-purple hover:bg-cm-purple hover:text-white"
            }`}
          >
            <BarChart2 size={14} />
            Stats
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4 flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ask a question... (e.g. 'OTP not received', 'error 130429', 'migrate from Wati')"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-dark-border rounded-xl bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-cm-purple transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setShowSearch(false);
                  setSearchError(null);
                  setPreviousSearch(null);
                  setDetectedLanguage(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={searchLoading || !searchQuery.trim()}
            className={`px-4 py-2.5 text-sm rounded-xl transition-colors flex items-center gap-2 ${
              searchLoading
                ? "bg-cm-purple/80 text-white cursor-wait"
                : searchQuery.trim()
                ? "bg-cm-purple text-white hover:bg-[#5b4fa8]"
                : "bg-dark-panel2 text-dark-muted cursor-not-allowed"
            }`}
          >
            {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {searchLoading ? "Searching..." : "Search"}
          </button>
          <ScreenshotUpload
            onAnalysisComplete={(analysis) => {
              // If error codes were extracted, use the most specific one as the query
              const errorCodeQuery = analysis.error_codes?.length
                ? `error ${analysis.error_codes[0]}`
                : null;

              const queryToUse =
                searchQuery.trim() ||
                errorCodeQuery ||
                analysis.search_query ||
                (analysis.stage ? `WABA ${analysis.stage} error` : "WABA setup error");
              handleSearch(queryToUse, true, {
                errors: analysis.errors ?? [],
                stage: analysis.stage ?? null,
                description: analysis.description ?? "",
                error_codes: analysis.error_codes,
              });
            }}
            disabled={searchLoading}
            clearKey={screenshotClearKey}
            currentQuery={searchQuery}
            onStatusChange={(s) => setScreenshotStatus(s)}
          />
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-dark-muted flex-shrink-0" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs border border-dark-border rounded-lg px-2 py-1.5 bg-dark-panel text-dark-muted focus:outline-none focus:ring-1 focus:ring-cm-purple"
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {indexAvailable && (
            <div className="flex items-center gap-1 ml-1">
              <Zap size={13} className="text-cm-purple" />
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value)}
                className="text-xs border border-dark-border rounded-lg px-2 py-1.5 bg-dark-panel text-dark-muted focus:outline-none focus:ring-1 focus:ring-cm-purple"
              >
                <option value="keyword">Keyword</option>
                <option value="hybrid">Hybrid (recommended)</option>
                <option value="semantic">Semantic</option>
              </select>
            </div>
          )}

          {screenshotStatus?.state === "success" && (
            <div className="flex items-center gap-2 ml-2 text-xs text-dark-muted">
              {screenshotStatus.description && (
                <span className="truncate max-w-xs">{screenshotStatus.description}</span>
              )}
              {screenshotStatus.previewUrl && (
                <a href={screenshotStatus.previewUrl} target="_blank" rel="noopener noreferrer"
                   className="text-cm-purple hover:text-[#5b4fa8] font-medium whitespace-nowrap">
                  View Image
                </a>
              )}
            </div>
          )}
          {screenshotStatus?.state === "error" && screenshotStatus.errorMessage && (
            <span className="ml-2 text-xs text-dark-danger truncate max-w-xs">{screenshotStatus.errorMessage}</span>
          )}
        </div>
      </div>

      {/* Index staleness banner */}
      {indexStale && (
        <div className="mb-4 flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-dark-warn/10 border border-dark-warn/30 rounded-xl">
          <RefreshCw size={14} className="text-dark-warn flex-shrink-0" />
          <span className="text-sm text-dark-warn flex-1">
            Search index is out of date. Rebuild to include your latest edits.
          </span>
          <button
            onClick={handleRebuildIndex}
            disabled={rebuilding}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-dark-warn/100 text-white hover:bg-dark-warn/80 disabled:opacity-60 transition-colors"
          >
            {rebuilding ? (
              <><Loader2 size={12} className="animate-spin" />Rebuilding...</>
            ) : (
              <><RefreshCw size={12} />Rebuild Index</>
            )}
          </button>
          <button
            onClick={() => setIndexStale(false)}
            className="text-amber-400 hover:text-dark-warn transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Rebuild result toast */}
      {rebuildResult && (
        <div className={`mb-4 flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${
          rebuildResult.ok
            ? "bg-dark-success/10 border border-dark-success/30 text-dark-success"
            : "bg-dark-danger/10 border border-dark-danger/30 text-dark-danger"
        }`}>
          {rebuildResult.ok ? (
            <RefreshCw size={14} className="text-dark-success" />
          ) : (
            <AlertTriangle size={14} className="text-dark-danger" />
          )}
          <span>{rebuildResult.message}</span>
          <button
            onClick={() => setRebuildResult(null)}
            className="ml-auto text-dark-muted hover:text-dark-muted"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats / History side panel */}
      {sidePanel !== "none" && (
        <div className="mb-4 flex-shrink-0 bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-text flex items-center gap-2">
              {sidePanel === "stats" ? <><BarChart2 size={14} className="text-cm-purple" /> Knowledge Base Stats</> : <><Clock size={14} className="text-cm-purple" /> Search History</>}
            </h2>
            <button onClick={() => setSidePanel("none")} className="text-dark-muted hover:text-dark-muted">
              <X size={14} />
            </button>
          </div>
          <div className="p-4">
            {sidePanel === "stats" && (
              statsLoading ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-cm-purple" /></div>
              ) : stats ? (
                <KbStatsPanel stats={stats} />
              ) : (
                <p className="text-sm text-dark-muted">Could not load stats.</p>
              )
            )}
            {sidePanel === "history" && (
              historyLoading ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-cm-purple" /></div>
              ) : (
                <HistoryPanel entries={history} onSearch={(q) => { handleSearch(q); setSidePanel("none"); }} />
              )
            )}
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — file tree */}
        <div className="w-64 flex-shrink-0 bg-dark-panel border border-dark-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel flex-shrink-0">
            <h2 className="text-sm font-semibold text-dark-text">Files</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {treeLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-cm-purple" />
              </div>
            )}
            {treeError && (
              <div className="p-3 text-sm text-dark-danger bg-dark-danger/10 rounded-lg">{treeError}</div>
            )}
            {!treeLoading && !treeError && tree.length === 0 && (
              <p className="p-3 text-sm text-dark-muted italic">No files found</p>
            )}
            {!treeLoading &&
              tree.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedPath}
                  onSelect={loadFile}
                />
              ))}
          </div>
        </div>

        {/* Right panel — content viewer/editor OR search results */}
        <div className="flex-1 min-w-0 bg-dark-panel border border-dark-border rounded-xl overflow-hidden flex flex-col">
          {/* Panel toolbar */}
          <div className="px-5 py-3 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel flex items-center gap-3 flex-shrink-0">
            {showSearch ? (
              <div className="flex items-center gap-2 flex-1">
                <Search size={14} className="text-cm-purple" />
                <span className="text-sm text-dark-muted font-medium truncate">
                  Results for &ldquo;{searchQuery}&rdquo;
                </span>
                {searchResults && (
                  <span className="text-xs text-dark-muted">({searchResults.length} results)</span>
                )}
                {detectedLanguage && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-dark-warn/15 text-dark-warn flex-shrink-0">
                    Query translated from {detectedLanguage}
                  </span>
                )}
              </div>
            ) : relativePath ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {previousSearch && (
                  <button
                    onClick={() => {
                      setShowSearch(true);
                      setSearchResults(previousSearch.results);
                      setSearchQuery(previousSearch.query);
                      setSelectedPath(null);
                      setFileContent(null);
                      setPreviousSearch(null);
                    }}
                    className="flex items-center gap-1.5 text-sm text-cm-purple hover:text-[#5b4fa8] transition-colors flex-shrink-0 mr-2"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                )}
                <span className="text-sm text-dark-muted font-mono truncate flex-1">{relativePath}</span>
              </div>
            ) : (
              <span className="text-sm text-dark-muted italic flex-1">Select a file to view</span>
            )}

            {fileContent && fileContent.isEditable && !showSearch && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {saveResult && (
                  <span className={`text-xs px-2 py-1 rounded-md ${saveResult.ok ? "bg-dark-success/20 text-dark-success" : "bg-dark-danger/15 text-dark-danger"}`}>
                    {saveResult.message}
                  </span>
                )}
                {editMode ? (
                  <>
                    <button
                      onClick={() => { setEditMode(false); setEditedContent(fileContent.content); setSaveResult(null); }}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-dark-panel2 text-dark-muted hover:bg-dark-panel2 transition-colors"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-cm-purple text-white hover:bg-[#5b4fa8] disabled:opacity-60 transition-colors"
                    >
                      {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Save size={14} />Save</>}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditMode(true); setSaveResult(null); }}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-cm-purple/15 text-cm-purple hover:bg-cm-purple hover:text-white transition-colors"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel body */}
          <div ref={contentRef} className="flex-1 overflow-auto min-h-0">
            {/* Search results view */}
            {showSearch && (
              <div className="p-5">
                {searchLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-cm-purple" />
                  </div>
                )}
                {searchError && (
                  <div className="flex items-start gap-3 p-4 bg-dark-danger/10 border border-dark-danger/30 rounded-xl text-dark-danger">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{searchError}</p>
                  </div>
                )}
                {searchResults && searchResults.length === 0 && (
                  <div className="text-center py-12 text-dark-muted">
                    <Search size={32} className="mx-auto mb-3 text-cm-purple-mid" />
                    <p className="text-sm">No results found. Try rephrasing your question.</p>
                  </div>
                )}
                {searchResults && searchResults.length > 0 && (
                  <>
                    <AiAnswerPanel
                      query={searchQuery}
                      isLoading={aiLoading}
                      answer={aiAnswer}
                      stage={aiStage}
                      sources={aiSources}
                      error={aiError}
                      onSourceClick={loadFile}
                      onDismiss={() => {
                        setAiAnswer(null);
                        setAiError(null);
                      }}
                    />
                    <div className="space-y-3">
                      {searchResults.map((result, idx) => (
                        <SearchResultCard
                          key={`${result.file_path}-${result.heading}-${idx}`}
                          result={result}
                          onViewFull={loadFile}
                          onSaved={() => setIndexStale(true)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Empty state */}
            {!showSearch && !selectedPath && (
              <div className="flex flex-col items-center justify-center h-full text-dark-muted gap-3">
                <BookOpen size={40} className="text-cm-purple-mid" />
                <p className="text-sm">Select a file from the tree to view its contents</p>
                <p className="text-xs text-dark-muted">Or use the search bar above to find answers</p>
              </div>
            )}

            {!showSearch && fileLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-cm-purple" />
              </div>
            )}

            {!showSearch && fileError && (
              <div className="p-6">
                <div className="flex items-start gap-3 p-4 bg-dark-danger/10 border border-dark-danger/30 rounded-xl text-dark-danger">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{fileError}</p>
                </div>
              </div>
            )}

            {!showSearch && fileContent && !fileLoading && (
              editMode ? (
                <textarea
                  aria-label="Edit file content"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full p-5 font-mono text-sm text-dark-text resize-none border-0 outline-none focus:ring-0 bg-dark-panel"
                  spellCheck={false}
                />
              ) : (
                <div className="p-6 prose prose-sm prose-invert max-w-none prose-headings:text-dark-text prose-headings:font-semibold prose-a:text-cm-purple prose-a:no-underline hover:prose-a:underline prose-code:text-cm-purple prose-code:bg-cm-purple/15 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-cm-dark prose-pre:text-cm-cream prose-blockquote:border-l-cm-purple prose-blockquote:text-dark-muted prose-strong:text-dark-text prose-hr:border-dark-border prose-p:text-dark-muted prose-li:text-dark-muted">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <HeadingWithId level={1}>{children}</HeadingWithId>,
                      h2: ({ children }) => <HeadingWithId level={2}>{children}</HeadingWithId>,
                      h3: ({ children }) => <HeadingWithId level={3}>{children}</HeadingWithId>,
                      h4: ({ children }) => <HeadingWithId level={4}>{children}</HeadingWithId>,
                    }}
                  >
                    {fileContent.content}
                  </ReactMarkdown>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
