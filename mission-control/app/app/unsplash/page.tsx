"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface Photo {
  photographer: string;
  photographerUrl: string;
  url: string;
  sourceUrl: string;
  downloadLocation: string;
  alt: string;
  source: string;
}

interface AgentStatus {
  agent: string;
  operation: string;
  result: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export default function UnsplashPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [triggeredIdx, setTriggeredIdx] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/unsplash");
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
    setTriggeredIdx(null);
    try {
      const res = await fetch(`/api/unsplash?q=${encodeURIComponent(query)}&count=6`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPhotos(data.photos || []);
      if ((data.photos || []).length === 0) setSearchError("No photos found for that query.");
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleTriggerDownload = async (photo: Photo, idx: number) => {
    if (!photo.downloadLocation) return;
    try {
      await fetch("/api/unsplash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
      });
      setTriggeredIdx(idx);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="unsplash" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cm-purple flex items-center justify-center text-white text-xl">
            🖼️
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Unsplash</h1>
            <p className="text-sm text-dark-muted">Stock Photo Agent — powered by Unsplash</p>
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

      {/* Info banner */}
      <div className="bg-cm-purple/10 border border-cm-purple/20 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-cm-purple mt-0.5 shrink-0" />
          <div className="text-sm text-dark-text">
            <p className="font-medium mb-1">Unsplash API Guidelines</p>
            <ul className="text-dark-muted space-y-0.5 list-disc list-inside text-xs">
              <li>Photos are hotlinked directly from Unsplash CDN — never re-hosted</li>
              <li>Download events are triggered when a photo is used (required)</li>
              <li>Attribution: Photo by [Name] on Unsplash — both linked</li>
            </ul>
            <p className="mt-2 text-dark-muted font-mono font-dm-mono text-xs">
              const unsplash = require(&apos;agents/unsplash/src&apos;);<br />
              const photos = await unsplash.search(&apos;AI automation&apos;, {"{ count: 3 }"});
            </p>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-cm-purple" />
          <h2 className="font-semibold  text-dark-text">Search Photos</h2>
        </div>
        <form onSubmit={handleSearch} className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='e.g. "entrepreneur business growth"'
            className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="w-full py-2 px-4 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searching ? "Searching..." : "Search Unsplash"}
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
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-dark-border group">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.alt || p.photographer}
                      className="w-full h-28 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleTriggerDownload(p, i)}
                        className="text-xs bg-dark-panel/90 text-dark-text px-2 py-1 rounded font-medium hover:bg-dark-panel"
                      >
                        {triggeredIdx === i ? "✓ Used" : "Mark as Used"}
                      </button>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 bg-dark-panel">
                    <p className="text-[10px] text-dark-muted leading-tight">
                      Photo by{" "}
                      <a href={p.photographerUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-dark-text">
                        {p.photographer}
                      </a>{" "}
                      on{" "}
                      <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-dark-text">
                        Unsplash
                      </a>
                    </p>
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cm-purple hover:text-cm-purple-mid flex items-center gap-0.5 mt-0.5"
                    >
                      <ExternalLink size={9} /> View on Unsplash
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
