"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Upload,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface Photo {
  photographer: string;
  url: string;
  pexelsUrl: string;
  alt: string;
}

interface PexelStatus {
  agent: string;
  operation: string;
  result: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export default function PexelPage() {
  const [status, setStatus] = useState<PexelStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Search state
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Import state
  const [importQuery, setImportQuery] = useState("");
  const [importFolder, setImportFolder] = useState("Blog Covers");
  const [importSlug, setImportSlug] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ wixFileId: string; staticUrl: string; photographer: string; pexelsUrl: string } | null>(null);
  const [importError, setImportError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pexel");
      const data = await res.json();
      setStatus(data.status);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setPhotos([]);
    try {
      const res = await fetch(`/api/pexel?q=${encodeURIComponent(query)}&count=6`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPhotos(data.photos || []);
      if ((data.photos || []).length === 0) setSearchError("No photos found for that query.");
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleImportWix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importQuery.trim()) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);
    try {
      const res = await fetch("/api/pexel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import-wix",
          query: importQuery,
          folder: importFolder || "Pexel Imports",
          slug: importSlug || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImportResult(data);
      await fetchStatus();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="pexel" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cm-purple to-pink-500 flex items-center justify-center text-white text-xl">
            📸
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Pexel</h1>
            <p className="text-sm text-dark-muted">Stock Photo Agent — powered by Pexels</p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 rounded-lg border border-dark-border hover:bg-dark-panel2 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className={`text-dark-muted ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
          status.result === "success" ? "bg-dark-success/10 border-dark-success/30 text-dark-success"
          : status.result === "error" ? "bg-dark-danger/10 border-dark-danger/30 text-dark-danger"
          : "bg-dark-panel2 border-dark-border text-dark-text"
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            status.result === "success" ? "bg-dark-success" : status.result === "error" ? "bg-dark-danger" : "bg-dark-muted"
          }`} />
          <span>Last: <strong>{status.operation}</strong> → {status.result}</span>
          <span className="ml-auto text-xs opacity-60">
            {new Date(status.timestamp).toLocaleString()}
          </span>
        </div>
      )}

      {/* Integration Info */}
      <div className="bg-cm-purple/10 border border-cm-purple/20 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-cm-purple mt-0.5 shrink-0" />
          <div className="text-sm text-dark-text">
            <p className="font-medium mb-1">Used by multiple agents</p>
            <p className="text-dark-muted">
              Wix (blog covers) · LinkedIn (carousel backgrounds) · X (post images) · Gumroad (product images)
            </p>
            <p className="mt-1 text-dark-muted font-mono font-dm-mono text-xs">
              const pexel = require(&apos;agents/pexel/src&apos;);<br />
              const result = await pexel.findForWix(&apos;AI automation&apos;, {"{ folder: 'Blog Covers' }"});
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Panel */}
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-cm-purple" />
            <h2 className="font-semibold  text-dark-text">Preview Search</h2>
          </div>
          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='e.g. "AI automation business team"'
              className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="w-full py-2 px-4 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {searching ? "Searching..." : "Search Pexels"}
            </button>
          </form>

          {searchError && (
            <div className="flex items-center gap-2 text-sm text-dark-danger">
              <AlertCircle size={14} /> {searchError}
            </div>
          )}

          {photos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-dark-muted">{photos.length} results</p>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-dark-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.alt || p.photographer}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                      <p className="text-white text-xs text-center leading-tight">{p.photographer}</p>
                      <a
                        href={p.pexelsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cm-purple text-xs flex items-center gap-1 hover:text-white"
                      >
                        <ExternalLink size={10} /> Pexels
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Import to Wix Panel */}
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-cm-purple" />
            <h2 className="font-semibold  text-dark-text">Import to Wix</h2>
          </div>
          <form onSubmit={handleImportWix} className="space-y-3">
            <input
              type="text"
              value={importQuery}
              onChange={e => setImportQuery(e.target.value)}
              placeholder='Search query (e.g. "business growth strategy")'
              className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={importFolder}
                onChange={e => setImportFolder(e.target.value)}
                placeholder="Wix folder name"
                className="px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <input
                type="text"
                value={importSlug}
                onChange={e => setImportSlug(e.target.value)}
                placeholder="Slug (optional)"
                className="px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>
            <button
              type="submit"
              disabled={importing || !importQuery.trim()}
              className="w-full py-2 px-4 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? "Importing..." : "Find & Import to Wix"}
            </button>
          </form>

          {importError && (
            <div className="flex items-center gap-2 text-sm text-dark-danger">
              <AlertCircle size={14} /> {importError}
            </div>
          )}

          {importResult && (
            <div className="space-y-2 p-3 bg-dark-success/10 border border-dark-success/30 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-dark-success font-medium">
                <Check size={14} /> Imported successfully
              </div>
              <div className="space-y-1 text-xs text-dark-text">
                <p><span className="font-medium">File ID:</span> {importResult.wixFileId || "(pending)"}</p>
                {importResult.staticUrl && (
                  <p>
                    <span className="font-medium">URL:</span>{" "}
                    <a href={importResult.staticUrl} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline break-all">
                      {importResult.staticUrl.slice(0, 60)}...
                    </a>
                  </p>
                )}
                <p>
                  <span className="font-medium">By:</span>{" "}
                  <a href={importResult.pexelsUrl} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline">
                    {importResult.photographer}
                  </a>
                </p>
              </div>
              {importResult.staticUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={importResult.staticUrl}
                  alt="Imported cover"
                  className="w-full h-32 object-cover rounded-lg mt-2"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* CLI Reference */}
      <div className="bg-dark-bg rounded-xl p-5">
        <h2 className="text-sm font-semibold  text-dark-muted mb-3 flex items-center gap-2">
          <ImageIcon size={14} /> CLI Reference
        </h2>
        <pre className="text-xs text-dark-success leading-relaxed overflow-x-auto">{`# Search
node ~/.openclaw/workspace/agents/pexel/src/index.js search "AI automation" --count=5

# Import to Wix
node ~/.openclaw/workspace/agents/pexel/src/index.js import-wix "AI automation" \\
  --folder="Blog Covers" --slug=my-post

# Download locally
node ~/.openclaw/workspace/agents/pexel/src/index.js import-local "AI automation" \\
  --output=/tmp/cover.jpg

# Build optimized query from blog post title
node ~/.openclaw/workspace/agents/pexel/src/index.js build-query "5 Ways AI Saves Time" \\
  --pillar="AI Automation"`}</pre>
      </div>
    </div>
  );
}
