"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Gauge, X, Loader2 } from "lucide-react";
import type { GscInspectionResult, CruxResult } from "@/lib/seo-types";

interface VerifyPanelProps {
  domain: string;
  url: string;
  onClose: () => void;
}

function formatState(state: string): string {
  return state
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

type MetricRating = "good" | "needs-improvement" | "poor";

function lcpRating(ms: number): MetricRating {
  if (ms < 2500) return "good";
  if (ms < 4000) return "needs-improvement";
  return "poor";
}

function inpRating(ms: number): MetricRating {
  if (ms < 200) return "good";
  if (ms < 500) return "needs-improvement";
  return "poor";
}

function clsRating(score: number): MetricRating {
  if (score < 0.1) return "good";
  if (score < 0.25) return "needs-improvement";
  return "poor";
}

function ratingClass(rating: MetricRating): string {
  if (rating === "good") return "bg-dark-success/20 text-dark-success border border-dark-success/30";
  if (rating === "needs-improvement") return "bg-dark-warn/20 text-dark-warn border border-dark-warn/30";
  return "bg-dark-danger/20 text-dark-danger border border-dark-danger/30";
}

function MetricBadge({ label, value, rating }: { label: string; value: string; rating: MetricRating }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${ratingClass(rating)}`}>
      <span className="text-dark-muted">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export default function VerifyPanel({ domain, url, onClose }: VerifyPanelProps) {
  const [loading, setLoading] = useState(true);
  const [gsc, setGsc] = useState<GscInspectionResult | null>(null);
  const [crux, setCrux] = useState<CruxResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      const [gscRes, cruxRes] = await Promise.allSettled([
        fetch("/api/seo/gsc-inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, siteUrl: `https://${domain}/` }),
        }).then((r) => r.json() as Promise<GscInspectionResult>),

        fetch(`/api/seo/crux?domain=${encodeURIComponent(domain)}`).then(
          (r) => r.json() as Promise<CruxResult>
        ),
      ]);

      if (cancelled) return;

      if (gscRes.status === "fulfilled") setGsc(gscRes.value);
      if (cruxRes.status === "fulfilled") setCrux(cruxRes.value);

      setLoading(false);
    }

    fetchData().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [url, domain]);

  // GSC state rendering
  function renderGscStatus() {
    if (!gsc) return null;

    let statusContent: React.ReactNode;

    switch (gsc.indexingState) {
      case "SUBMITTED_AND_INDEXED":
        statusContent = (
          <span className="text-dark-success font-medium">Indexed by Google</span>
        );
        break;
      case "URL_IS_NOT_ON_GOOGLE":
      case "URL_IS_UNKNOWN_TO_GOOGLE":
        statusContent = (
          <span className="text-dark-warn font-medium">Not yet indexed</span>
        );
        break;
      case "BLOCKED_DUE_TO_NOINDEX":
        statusContent = (
          <span className="text-dark-danger font-medium">Blocked: noindex tag</span>
        );
        break;
      case "DUPLICATE_WITHOUT_CANONICAL":
        statusContent = (
          <span className="text-dark-warn font-medium">Duplicate — canonical not set</span>
        );
        break;
      default:
        statusContent = (
          <span className="text-dark-muted">{formatState(gsc.indexingState)}</span>
        );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-dark-muted shrink-0" />
          <span className="text-xs text-dark-muted">Google Index:</span>
          {statusContent}
        </div>
        {gsc.lastCrawlTime && (
          <p className="text-xs text-dark-muted ml-5">
            Last crawled: {formatDate(gsc.lastCrawlTime)}
          </p>
        )}
      </div>
    );
  }

  // CrUX rendering
  function renderCrux() {
    if (!crux) return null;

    if (crux.dataSource === "not_found") {
      return (
        <div className="flex items-center gap-2">
          <Gauge size={13} className="text-dark-muted shrink-0" />
          <span className="text-xs text-dark-muted">No real-user data yet (low traffic)</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Gauge size={13} className="text-dark-muted shrink-0" />
          <span className="text-xs text-dark-muted">Core Web Vitals:</span>
          {crux.dataSource === "origin" && (
            <span className="text-[10px] text-dark-muted">(site-level data)</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 ml-5">
          {crux.lcp && (
            <MetricBadge
              label="LCP"
              value={`${(crux.lcp.p75 / 1000).toFixed(1)}s`}
              rating={lcpRating(crux.lcp.p75)}
            />
          )}
          {crux.inp && (
            <MetricBadge
              label="INP"
              value={`${crux.inp.p75}ms`}
              rating={inpRating(crux.inp.p75)}
            />
          )}
          {crux.cls && (
            <MetricBadge
              label="CLS"
              value={crux.cls.p75.toFixed(3)}
              rating={clsRating(crux.cls.p75)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 mt-2 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dark-muted">Verification</span>
        <button
          onClick={onClose}
          className="text-dark-muted hover:text-dark-text transition-colors"
          aria-label="Close"
        >
          <X size={13} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-1">
          <Loader2 size={13} className="animate-spin text-cm-purple" />
          <span className="text-xs text-dark-muted">Fetching live data...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {renderGscStatus()}
          {renderCrux()}
          {!gsc && !crux && (
            <p className="text-xs text-dark-muted">No data available</p>
          )}
        </div>
      )}
    </div>
  );
}
