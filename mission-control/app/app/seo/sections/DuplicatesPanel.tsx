"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw, Copy, FileX } from "lucide-react";
import type { DuplicateContentResult } from "@/lib/seo-types";

interface DuplicatesPanelProps {
  domain: string;
}

export default function DuplicatesPanel({ domain }: DuplicatesPanelProps) {
  const [result, setResult] = useState<DuplicateContentResult | null>(null);
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
      const url = `/api/seo/duplicates?domain=${encodeURIComponent(domain)}${refresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data: DuplicateContentResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to load duplicate content data");
    } finally {
      setLoading(false);
    }
  }

  const totalIssues =
    (result?.duplicateTitles.length ?? 0) +
    (result?.duplicateDescriptions.length ?? 0) +
    (result?.missingTitles.length ?? 0) +
    (result?.missingDescriptions.length ?? 0);

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark-text">Duplicate Content</h3>
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
          Scanning for duplicates...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-dark-danger text-sm py-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-5">
          {totalIssues === 0 && (
            <div className="flex items-center gap-2 text-dark-success text-sm py-2">
              <AlertCircle size={15} />
              No duplicate titles or descriptions found.
            </div>
          )}

          {/* Duplicate Titles */}
          {result.duplicateTitles.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Copy size={13} className="text-dark-warn" />
                <p className="text-xs font-semibold text-dark-warn uppercase tracking-wide">
                  Duplicate Titles ({result.duplicateTitles.length})
                </p>
              </div>
              <div className="space-y-2">
                {result.duplicateTitles.map((group, i) => (
                  <div key={i} className="bg-dark-panel2 border border-dark-warn/30 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-dark-warn truncate">&quot;{group.title}&quot;</p>
                    <ul className="space-y-0.5">
                      {group.urls.map((url, j) => (
                        <li key={j} className="text-xs text-dark-muted truncate pl-2 border-l border-dark-border">
                          {url}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Descriptions */}
          {result.duplicateDescriptions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Copy size={13} className="text-dark-warn" />
                <p className="text-xs font-semibold text-dark-warn uppercase tracking-wide">
                  Duplicate Descriptions ({result.duplicateDescriptions.length})
                </p>
              </div>
              <div className="space-y-2">
                {result.duplicateDescriptions.map((group, i) => (
                  <div key={i} className="bg-dark-panel2 border border-dark-warn/30 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-dark-warn line-clamp-2">&quot;{group.description}&quot;</p>
                    <ul className="space-y-0.5">
                      {group.urls.map((url, j) => (
                        <li key={j} className="text-xs text-dark-muted truncate pl-2 border-l border-dark-border">
                          {url}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Titles */}
          {result.missingTitles.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileX size={13} className="text-dark-danger" />
                <p className="text-xs font-semibold text-dark-danger uppercase tracking-wide">
                  Missing Titles ({result.missingTitles.length})
                </p>
              </div>
              <div className="space-y-1">
                {result.missingTitles.map((url, i) => (
                  <div key={i} className="bg-dark-danger/10 border border-dark-danger/20 rounded px-3 py-1.5">
                    <span className="text-xs text-dark-text truncate block">{url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Descriptions */}
          {result.missingDescriptions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileX size={13} className="text-dark-danger" />
                <p className="text-xs font-semibold text-dark-danger uppercase tracking-wide">
                  Missing Descriptions ({result.missingDescriptions.length})
                </p>
              </div>
              <div className="space-y-1">
                {result.missingDescriptions.map((url, i) => (
                  <div key={i} className="bg-dark-danger/10 border border-dark-danger/20 rounded px-3 py-1.5">
                    <span className="text-xs text-dark-text truncate block">{url}</span>
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
        <p className="text-sm text-dark-muted">No data yet. Click &quot;Scan again&quot; to start.</p>
      )}
    </div>
  );
}
