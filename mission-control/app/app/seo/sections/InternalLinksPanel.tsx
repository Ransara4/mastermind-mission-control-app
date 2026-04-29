"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw, Link2, AlertTriangle, ArrowUp } from "lucide-react";
import type { InternalLinkMap } from "@/lib/seo-types";

interface InternalLinksPanelProps {
  domain: string;
}

export default function InternalLinksPanel({ domain }: InternalLinksPanelProps) {
  const [result, setResult] = useState<InternalLinkMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) return;
    load();
  }, [domain]);

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/seo/internal-links?domain=${encodeURIComponent(domain)}${refresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data: InternalLinkMap = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to load internal link data");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = result?.pages.length ?? 0;
  const totalLinks = result?.pages.reduce((s, p) => s + p.outboundLinks, 0) ?? 0;
  const orphans = result?.pages.filter((p) => p.isOrphan) ?? [];
  const topLinked = result
    ? [...result.pages].sort((a, b) => b.inboundLinks - a.inboundLinks).slice(0, 5)
    : [];

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark-text">Internal Link Map</h3>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50 px-2 py-1 rounded bg-dark-panel2 border border-dark-border"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Scan again
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-dark-muted text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          Scanning internal links...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-dark-danger text-sm py-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-dark-text">{totalPages}</p>
              <p className="text-xs text-dark-muted mt-0.5">Pages crawled</p>
            </div>
            <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-dark-text">{totalLinks}</p>
              <p className="text-xs text-dark-muted mt-0.5">Total links</p>
            </div>
            <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${orphans.length > 0 ? "text-dark-danger" : "text-dark-success"}`}>
                {orphans.length}
              </p>
              <p className="text-xs text-dark-muted mt-0.5">Orphan pages</p>
            </div>
          </div>

          {/* Orphan pages */}
          {orphans.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} className="text-dark-danger" />
                <p className="text-xs font-semibold text-dark-danger uppercase tracking-wide">Orphan Pages</p>
              </div>
              <div className="space-y-1">
                {orphans.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-dark-danger/10 border border-dark-danger/20 rounded px-3 py-1.5">
                    <Link2 size={11} className="text-dark-danger shrink-0" />
                    <span className="text-xs text-dark-text truncate">{p.url}</span>
                    <span className="text-xs text-dark-muted ml-auto shrink-0">{p.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top linked pages */}
          {topLinked.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowUp size={13} className="text-dark-success" />
                <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide">Most Linked Pages</p>
              </div>
              <div className="space-y-1">
                {topLinked.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-dark-panel2 border border-dark-border rounded px-3 py-1.5">
                    <span className="text-xs text-dark-muted w-5 text-right shrink-0">#{i + 1}</span>
                    <span className="text-xs text-dark-text truncate flex-1">{p.url}</span>
                    <span className="text-xs text-dark-muted shrink-0">{p.inboundLinks} inbound</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-dark-muted">
            Analyzed: {new Date(result.analyzedAt).toLocaleString()}
          </p>
        </div>
      )}

      {!loading && !error && !result && (
        <p className="text-sm text-dark-muted">No internal link data yet. Click &quot;Scan again&quot; to start.</p>
      )}
    </div>
  );
}
