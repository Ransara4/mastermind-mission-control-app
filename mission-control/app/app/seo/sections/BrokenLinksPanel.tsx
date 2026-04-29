"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { BrokenLinksResult } from "@/lib/seo-types";

interface BrokenLinksPanelProps {
  domain: string;
}

export default function BrokenLinksPanel({ domain }: BrokenLinksPanelProps) {
  const [result, setResult] = useState<BrokenLinksResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(refresh = false) {
    if (!domain) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/api/seo/broken-links?domain=${encodeURIComponent(domain)}${refresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data: BrokenLinksResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to load broken links data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  if (!domain) return null;

  if (loading && !result) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-cm-purple" />
          <span className="text-sm text-dark-muted">Scanning for broken links…</span>
        </div>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-dark-warn mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-dark-text font-medium">Broken link scan unavailable</p>
            <p className="text-xs text-dark-muted mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => load(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text rounded-lg text-xs transition-colors shrink-0"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const noBroken = !result || (result.broken.length === 0 && result.redirectChains.length === 0);

  if (noBroken && result) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={16} className="text-dark-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-dark-text">No broken links found</p>
              <p className="text-xs text-dark-muted mt-0.5">
                {result.linksChecked} links checked across {result.scanned} page{result.scanned !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text rounded-lg text-xs transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Scan again
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  function statusBadgeClass(code: number): string {
    if (code === 0) return "bg-dark-panel2 border border-dark-border text-dark-muted";
    if (code >= 400 && code < 500) return "bg-dark-danger/15 border border-dark-danger/30 text-dark-danger";
    if (code >= 500) return "bg-dark-warn/15 border border-dark-warn/30 text-dark-warn";
    return "bg-dark-panel2 border border-dark-border text-dark-muted";
  }

  function statusLabel(code: number): string {
    if (code === 0) return "ERR";
    return String(code);
  }

  return (
    <div className="space-y-4">
      {/* Broken Links */}
      {result.broken.length > 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-dark-danger shrink-0" />
              <h3 className="text-sm font-semibold text-dark-text">
                {result.broken.length} Broken Link{result.broken.length !== 1 ? "s" : ""}
              </h3>
              <span className="bg-dark-danger/15 border border-dark-danger/30 text-dark-danger text-xs font-medium px-2 py-0.5 rounded-full">
                {result.broken.length}
              </span>
            </div>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text rounded-lg text-xs transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Scan again
            </button>
          </div>

          <div className="space-y-2">
            {result.broken.map((link, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-dark-panel2 border border-dark-border rounded-lg"
              >
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${statusBadgeClass(link.statusCode)}`}
                >
                  {statusLabel(link.statusCode)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-xs font-mono text-dark-text truncate">
                      {link.url}
                    </p>
                    {link.isExternal && (
                      <ExternalLink size={10} className="text-dark-muted shrink-0" />
                    )}
                  </div>
                  {link.linkText && (
                    <p className="text-xs text-dark-muted mt-0.5 truncate">
                      &ldquo;{link.linkText}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] text-dark-muted mt-0.5 truncate">
                    Found on:{" "}
                    <span className="font-mono">{link.foundOn}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redirect Chains */}
      {result.redirectChains.length > 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight size={16} className="text-dark-warn shrink-0" />
            <h3 className="text-sm font-semibold text-dark-text">
              {result.redirectChains.length} Redirect Chain{result.redirectChains.length !== 1 ? "s" : ""}{" "}
              <span className="text-dark-muted font-normal">(2+ hops)</span>
            </h3>
          </div>

          <p className="text-xs text-dark-muted mb-3">
            Each extra hop wastes link equity passed through that URL.
          </p>

          <div className="space-y-3">
            {result.redirectChains.map((chain, i) => (
              <div
                key={i}
                className="p-3 bg-dark-panel2 border border-dark-border rounded-lg"
              >
                <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                  {chain.chain.map((hop, hi) => (
                    <span key={hi} className="flex items-center gap-1">
                      <span className="text-dark-text truncate max-w-[200px]">{hop.url}</span>
                      {hi < chain.chain.length - 1 && (
                        <ArrowRight size={10} className="text-dark-muted shrink-0" />
                      )}
                    </span>
                  ))}
                  {chain.chain[chain.chain.length - 1]?.url !== chain.finalUrl && (
                    <>
                      <ArrowRight size={10} className="text-dark-muted shrink-0" />
                      <span className="text-dark-success truncate max-w-[200px]">{chain.finalUrl}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-dark-muted">{chain.hops} hops</span>
                  <span className="text-[11px] text-dark-muted truncate">
                    Found on: <span className="font-mono">{chain.foundOn}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
