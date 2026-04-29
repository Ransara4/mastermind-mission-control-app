"use client";

import {
  HardDrive,
  Folder,
  File,
  Search,
  Upload,
  RefreshCw,
  Loader2,
  AlertCircle,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Settings,
  Zap,
  Clock,
  ExternalLink,
  Home,
  Download,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { useDropboxData, useDropboxBrowser } from "@/hooks/useDropboxData";
import type { DropboxFile } from "@/hooks/useDropboxData";

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "--";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0) + " " + units[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

function StorageBar({
  used,
  allocated,
  percentUsed,
}: {
  used: number;
  allocated: number;
  percentUsed: number;
}) {
  const barColor =
    percentUsed > 90
      ? "bg-dark-danger"
      : percentUsed > 70
      ? "bg-dark-warn"
      : "bg-cm-purple";

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-dark-text">
            {formatBytes(used)}
          </span>
          <span className="text-sm text-dark-muted ml-1">
            of {formatBytes(allocated)}
          </span>
        </div>
        <span className="text-sm font-medium text-dark-muted">
          {percentUsed}% used
        </span>
      </div>
      <div className="w-full h-3 bg-dark-panel2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-dark-muted">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(allocated - used)} free</span>
      </div>
    </div>
  );
}

function FileRow({
  file,
  onNavigate,
  onFileClick,
}: {
  file: DropboxFile;
  onNavigate: (path: string) => void;
  onFileClick: (file: DropboxFile) => void;
}) {
  const isFolder = file.type === "folder";
  const Icon = isFolder ? Folder : File;
  const iconColor = isFolder ? "text-cm-purple" : "text-dark-muted";

  return (
    <tr
      className="border-t border-dark-border hover:bg-dark-panel2 transition-colors cursor-pointer group"
      onClick={() => (isFolder ? onNavigate(file.path) : onFileClick(file))}
    >
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <span className="text-sm text-dark-text truncate max-w-xs group-hover:text-cm-purple transition-colors">
            {file.name}
          </span>
          {isFolder && (
            <ChevronRight size={14} className="text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
          {!isFolder && (
            <ExternalLink size={12} className="text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </td>
      <td className="py-2.5 px-3">
        <span className="text-xs text-dark-muted capitalize">{file.type}</span>
      </td>
      <td className="py-2.5 px-3 text-right">
        <span className="text-xs text-dark-muted">
          {file.type === "folder" ? "--" : formatBytes(file.size)}
        </span>
      </td>
      <td className="py-2.5 px-3 text-right">
        <span className="text-xs text-dark-muted">
          {formatDate(file.modified)}
        </span>
      </td>
    </tr>
  );
}

function Breadcrumbs({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate: (path: string) => void;
}) {
  const parts = path.split("/").filter(Boolean);
  const crumbs = parts.map((part, i) => ({
    name: part,
    path: "/" + parts.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="flex items-center gap-1 text-sm overflow-x-auto">
      <button
        onClick={() => onNavigate("")}
        className="flex items-center gap-1 text-dark-muted hover:text-cm-purple transition-colors px-1.5 py-0.5 rounded hover:bg-dark-panel2 flex-shrink-0"
      >
        <Home size={14} />
        <span>Dropbox</span>
      </button>
      {crumbs.map((crumb) => (
        <div key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
          <ChevronRight size={14} className="text-dark-muted" />
          <button
            onClick={() => onNavigate(crumb.path)}
            className="text-dark-muted hover:text-cm-purple transition-colors px-1.5 py-0.5 rounded hover:bg-dark-panel2 truncate max-w-[200px]"
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}

function FilePreviewPanel({
  file,
  onClose,
  getFileLink,
}: {
  file: DropboxFile;
  onClose: () => void;
  getFileLink: (path: string) => Promise<string | null>;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);

  useEffect(() => {
    setLoadingLink(true);
    getFileLink(file.path).then((url) => {
      setLink(url);
      setLoadingLink(false);
    });
  }, [file.path, getFileLink]);

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext);
  const isPdf = ext === "pdf";
  const isText = ["txt", "md", "json", "csv", "log", "xml", "html", "css", "js", "ts", "tsx", "py"].includes(ext);

  return (
    <div className="bg-dark-panel rounded-xl border border-cm-purple/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <File size={18} className="text-cm-purple flex-shrink-0" />
          <span className="text-sm font-medium text-dark-text truncate">{file.name}</span>
          <span className="text-xs text-dark-muted bg-dark-panel2 px-2 py-0.5 rounded-full flex-shrink-0">{ext.toUpperCase()}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-dark-panel2 rounded-lg p-2.5">
          <span className="text-dark-muted block">Size</span>
          <span className="text-dark-text font-medium">{formatBytes(file.size)}</span>
        </div>
        <div className="bg-dark-panel2 rounded-lg p-2.5">
          <span className="text-dark-muted block">Modified</span>
          <span className="text-dark-text font-medium">{formatDate(file.modified)}</span>
        </div>
        <div className="bg-dark-panel2 rounded-lg p-2.5">
          <span className="text-dark-muted block">Path</span>
          <span className="text-dark-text font-medium truncate block" title={file.path}>{file.path}</span>
        </div>
      </div>

      {/* Preview area */}
      {loadingLink ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-cm-purple" />
        </div>
      ) : link ? (
        <div className="space-y-3">
          {isImage && (
            <div className="rounded-lg overflow-hidden border border-dark-border bg-dark-panel2 flex items-center justify-center max-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={link} alt={file.name} className="max-w-full max-h-[400px] object-contain" />
            </div>
          )}
          {isPdf && (
            <iframe src={link} className="w-full h-[500px] rounded-lg border border-dark-border" title={file.name} />
          )}
          {isText && (
            <TextPreview url={link} />
          )}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm"
          >
            <Download size={16} />
            Download
          </a>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-dark-muted">Could not generate preview link</p>
        </div>
      )}
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        // Limit to first 200 lines for preview
        const lines = text.split("\n");
        setContent(lines.slice(0, 200).join("\n") + (lines.length > 200 ? "\n\n... (truncated)" : ""));
      })
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-dark-muted" /></div>;
  if (!content) return null;

  return (
    <pre className="bg-dark-panel2 rounded-lg border border-dark-border p-4 text-xs text-dark-text font-dm-mono overflow-auto max-h-[400px] whitespace-pre-wrap">
      {content}
    </pre>
  );
}

export default function DropboxPage() {
  const { data, loading, error, refresh } = useDropboxData();
  const browser = useDropboxBrowser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DropboxFile | null>(null);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Dropbox data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold  text-dark-text mb-2">
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

  const connected = data.auth.connected;
  const statusColor = connected ? "bg-dark-success" : "bg-dark-warn";
  const statusText = connected ? "Connected" : "Not Connected";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ApiKeyBanner slug="dropbox" />
      {/* 1. Header */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cm-purple/10 rounded-xl">
            <HardDrive size={28} className="text-cm-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Dropbox</h1>
            <p className="text-dark-muted mt-0.5 text-sm">
              {data.account
                ? `${data.account.name} (${data.account.email})`
                : "Knowledge layer -- searches files, retrieves documents, provides context"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${statusColor}`}
              />
              <span className="text-sm text-dark-muted">{statusText}</span>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Storage Overview */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h3 className="font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
          <HardDrive size={18} className="text-cm-purple" />
          Storage Overview
        </h3>
        {data.spaceUsage ? (
          <StorageBar
            used={data.spaceUsage.used}
            allocated={data.spaceUsage.allocated}
            percentUsed={data.spaceUsage.percentUsed}
          />
        ) : (
          <div className="text-center py-6">
            <HardDrive size={24} className="text-dark-muted mx-auto mb-2" />
            <p className="text-sm text-dark-muted">
              {connected
                ? "Storage info unavailable"
                : "Connect Dropbox to view storage usage"}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-dark-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-text">
              {data.stats.totalSyncs}
            </p>
            <p className="text-xs text-dark-muted mt-0.5">Total Syncs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-text">
              {data.stats.totalFilesSynced}
            </p>
            <p className="text-xs text-dark-muted mt-0.5">Files Synced</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-text">
              {data.stats.sharedLinks}
            </p>
            <p className="text-xs text-dark-muted mt-0.5">Shared Links</p>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => {
            setBrowserOpen(true);
            setSelectedFile(null);
            browser.browseTo("");
          }}
          className="bg-dark-panel rounded-xl border border-dark-border p-5 hover:border-cm-purple hover:bg-cm-purple/10 transition-all text-left group"
        >
          <div className="p-2 bg-cm-purple/10 rounded-lg w-fit mb-3 group-hover:bg-cm-purple/20 transition-colors">
            <FolderOpen size={20} className="text-cm-purple" />
          </div>
          <h4 className="font-medium text-dark-text text-sm">Browse Files</h4>
          <p className="text-xs text-dark-muted mt-1">
            View folders and files in your Dropbox
          </p>
        </button>

        <button className="bg-dark-panel rounded-xl border border-dark-border p-5 hover:border-cm-purple hover:bg-cm-purple/10 transition-all text-left group opacity-50 cursor-not-allowed">
          <div className="p-2 bg-cm-purple/10 rounded-lg w-fit mb-3">
            <Search size={20} className="text-cm-purple" />
          </div>
          <h4 className="font-medium text-dark-text text-sm">Search</h4>
          <p className="text-xs text-dark-muted mt-1">
            Find files by name or content
          </p>
        </button>

        <button className="bg-dark-panel rounded-xl border border-dark-border p-5 hover:border-cm-purple hover:bg-cm-purple/10 transition-all text-left group opacity-50 cursor-not-allowed">
          <div className="p-2 bg-dark-success/10 rounded-lg w-fit mb-3">
            <Upload size={20} className="text-dark-success" />
          </div>
          <h4 className="font-medium text-dark-text text-sm">Upload</h4>
          <p className="text-xs text-dark-muted mt-1">
            Upload files to Dropbox
          </p>
        </button>
      </div>

      {/* 4. File Browser / Recent Files */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        {browserOpen ? (
          <>
            {/* Browser header with breadcrumbs */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => {
                    if (browser.currentPath) {
                      browser.goUp();
                    } else {
                      setBrowserOpen(false);
                      setSelectedFile(null);
                    }
                  }}
                  className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors flex-shrink-0"
                  title={browser.currentPath ? "Go up" : "Back to recent files"}
                >
                  <ChevronLeft size={18} />
                </button>
                <Breadcrumbs path={browser.currentPath} onNavigate={(p) => { browser.browseTo(p); setSelectedFile(null); }} />
              </div>
              {browser.browsing && <Loader2 size={16} className="animate-spin text-cm-purple flex-shrink-0" />}
            </div>

            {/* Selected file preview */}
            {selectedFile && (
              <div className="mb-4">
                <FilePreviewPanel
                  file={selectedFile}
                  onClose={() => setSelectedFile(null)}
                  getFileLink={browser.getFileLink}
                />
              </div>
            )}

            {/* File listing */}
            {browser.browseError ? (
              <div className="text-center py-8">
                <AlertCircle size={24} className="text-dark-danger mx-auto mb-2" />
                <p className="text-sm text-dark-muted">{browser.browseError}</p>
              </div>
            ) : browser.entries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Name</th>
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Type</th>
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Size</th>
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {browser.entries.map((file) => (
                      <FileRow
                        key={file.path}
                        file={file}
                        onNavigate={(p) => { browser.browseTo(p); setSelectedFile(null); }}
                        onFileClick={(f) => setSelectedFile(f)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !browser.browsing ? (
              <div className="text-center py-8">
                <Folder size={28} className="text-dark-muted mx-auto mb-2" />
                <p className="text-sm text-dark-muted">This folder is empty</p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {/* Recent files (default view) */}
            <h3 className="font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
              <File size={18} className="text-dark-muted" />
              Recent Files
              {data.recentFiles.length > 0 && (
                <span className="text-xs text-dark-muted font-normal ml-1">
                  ({data.recentFiles.length} items)
                </span>
              )}
            </h3>

            {data.recentFiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Name</th>
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Type</th>
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Size</th>
                      <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentFiles.map((file) => (
                      <FileRow
                        key={file.path}
                        file={file}
                        onNavigate={(p) => {
                          setBrowserOpen(true);
                          browser.browseTo(p);
                          setSelectedFile(null);
                        }}
                        onFileClick={(f) => {
                          setBrowserOpen(true);
                          browser.browseTo(f.path.substring(0, f.path.lastIndexOf("/")) || "");
                          setSelectedFile(f);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Folder size={28} className="text-dark-muted mx-auto mb-2" />
                <p className="text-sm text-dark-muted">
                  {connected
                    ? "No files found in root folder"
                    : "Connect Dropbox to browse files"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. Settings (collapsible) */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">Settings</span>
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
                  Account
                </label>
                <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-text font-dm-mono">
                  {data.account
                    ? `${data.account.name} (${data.account.email})`
                    : "Not connected"}
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Auth Status
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      data.auth.hasRefreshToken
                        ? "bg-dark-success/10 text-dark-success"
                        : "bg-dark-warn/10 text-dark-warn"
                    }`}
                  >
                    Refresh Token:{" "}
                    {data.auth.hasRefreshToken ? "Set" : "Missing"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      data.auth.hasAppKey
                        ? "bg-dark-success/10 text-dark-success"
                        : "bg-dark-warn/10 text-dark-warn"
                    }`}
                  >
                    App Key: {data.auth.hasAppKey ? "Set" : "Missing"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Agent Location
              </label>
              <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-text font-dm-mono">
                ~/.openclaw/workspace/agents/dropbox/
              </code>
              <p className="text-xs text-dark-muted mt-1">
                Config: agents/dropbox/config/config.json
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 6. Capabilities (collapsible) */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setCapabilitiesOpen(!capabilitiesOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">
              What It Can Do
            </span>
          </div>
          {capabilitiesOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {capabilitiesOpen && (
          <div className="px-5 pb-5 space-y-3 border-t border-dark-border pt-4">
            <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
              <h4 className="font-medium text-cm-purple">Search Files</h4>
              <p className="text-sm text-dark-muted mt-1">
                Search across all Dropbox files by name or content. Find
                documents, images, and project files instantly.
              </p>
            </div>
            <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
              <h4 className="font-medium text-cm-purple">
                Retrieve Documents
              </h4>
              <p className="text-sm text-dark-muted mt-1">
                Fetch any file on demand to provide context for tasks.
                Supports docs, images, PDFs, and more.
              </p>
            </div>
            <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
              <h4 className="font-medium text-cm-purple">
                Sync and Share
              </h4>
              <p className="text-sm text-dark-muted mt-1">
                Sync files between local paths and Dropbox, create shared
                links, and manage file visibility.
              </p>
            </div>
            <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
              <h4 className="font-medium text-cm-purple">
                Project Context
              </h4>
              <p className="text-sm text-dark-muted mt-1">
                Maintains a map of Dropbox folder structure and known
                projects. Powers contextual lookups for content creation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 7. Activity Log */}
      {data.activity.length > 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h3 className="font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
            <Clock size={18} className="text-dark-muted" />
            Recent Activity
          </h3>
          <div className="space-y-2">
            {data.activity.slice(0, 10).map((act, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-dark-panel2 rounded-lg"
              >
                <Clock size={14} className="text-dark-muted mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark-text capitalize">
                      {act.action}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        act.result === "success"
                          ? "bg-dark-success/10 text-dark-success"
                          : act.result === "partial"
                          ? "bg-dark-warn/10 text-dark-warn"
                          : "bg-dark-danger/10 text-dark-danger"
                      }`}
                    >
                      {act.result}
                    </span>
                  </div>
                  <p className="text-xs text-dark-muted mt-0.5">
                    {act.details}
                  </p>
                  {act.timestamp && (
                    <p className="text-xs text-dark-muted mt-0.5">
                      {formatDate(act.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
