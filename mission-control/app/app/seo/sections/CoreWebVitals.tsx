"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Monitor, Smartphone } from "lucide-react";

interface VitalsMetrics {
  score: number;
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface PageSpeedData {
  url: string;
  mobile: VitalsMetrics;
  desktop: VitalsMetrics;
  fetchedAt: string;
  rateLimited?: boolean;
  fromCache?: boolean;
}

interface MetricThreshold {
  label: string;
  key: keyof VitalsMetrics;
  unit: string;
  good: number;
  poor: number;
  format: (v: number) => string;
}

const METRICS: MetricThreshold[] = [
  {
    label: "LCP",
    key: "lcp",
    unit: "ms",
    good: 2500,
    poor: 4000,
    format: (v) => `${Math.round(v)} ms`,
  },
  {
    label: "FID",
    key: "fid",
    unit: "ms",
    good: 100,
    poor: 300,
    format: (v) => `${Math.round(v)} ms`,
  },
  {
    label: "CLS",
    key: "cls",
    unit: "",
    good: 0.1,
    poor: 0.25,
    format: (v) => v.toFixed(3),
  },
  {
    label: "FCP",
    key: "fcp",
    unit: "ms",
    good: 1800,
    poor: 3000,
    format: (v) => `${Math.round(v)} ms`,
  },
  {
    label: "TTFB",
    key: "ttfb",
    unit: "ms",
    good: 800,
    poor: 1800,
    format: (v) => `${Math.round(v)} ms`,
  },
];

function ratingColor(value: number, good: number, poor: number): string {
  if (value <= good) return "text-dark-success";
  if (value <= poor) return "text-dark-warn";
  return "text-dark-danger";
}

function ratingBg(value: number, good: number, poor: number): string {
  if (value <= good) return "bg-dark-success/10";
  if (value <= poor) return "bg-dark-warn/10";
  return "bg-dark-danger/10";
}

function ratingDot(value: number, good: number, poor: number): string {
  if (value <= good) return "bg-dark-success";
  if (value <= poor) return "bg-cm-purple";
  return "bg-dark-danger";
}

function scoreColor(score: number): string {
  if (score >= 90) return "text-dark-success";
  if (score >= 50) return "text-dark-warn";
  return "text-dark-danger";
}


function ScoreCircle({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-dark-panel2"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={scoreColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xl font-bold ${scoreColor(score)}`}>
          {score}
        </span>
      </div>
    </div>
  );
}

function MetricsPanel({
  metrics,
  label,
  icon: Icon,
}: {
  metrics: VitalsMetrics;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-dark-muted" />
        <h4 className="text-sm font-semibold tracking-tight text-dark-text">{label}</h4>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <ScoreCircle score={metrics.score} />
        <div>
          <p className={`text-sm font-medium ${scoreColor(metrics.score)}`}>
            {metrics.score >= 90
              ? "Good"
              : metrics.score >= 50
              ? "Needs Improvement"
              : "Poor"}
          </p>
          <p className="text-xs text-dark-muted">Performance score</p>
        </div>
      </div>

      <div className="space-y-2">
        {METRICS.map((m) => {
          const value = metrics[m.key];
          return (
            <div
              key={m.key}
              className={`flex items-center justify-between py-2 px-3 rounded-lg ${ratingBg(
                value,
                m.good,
                m.poor
              )}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${ratingDot(
                    value,
                    m.good,
                    m.poor
                  )}`}
                />
                <span className="text-sm text-dark-text font-medium">
                  {m.label}
                </span>
              </div>
              <span
                className={`text-sm font-semibold ${ratingColor(
                  value,
                  m.good,
                  m.poor
                )}`}
              >
                {m.format(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CoreWebVitals({ domain }: { domain: string }) {
  const [data, setData] = useState<PageSpeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitedNoCache, setRateLimitedNoCache] = useState<string | null>(null);

  const fetchData = useCallback(
    (forceRefresh = false) => {
      if (!domain) return;
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ domain });
      if (forceRefresh) params.set("refresh", "true");

      fetch(`/api/seo/pagespeed?${params.toString()}`)
        .then((r) => {
          if (!r.ok) {
            return r.json().then((d) => {
              // Rate limited with no cache — show specific message
              if (d.rateLimited && !d.fromCache) {
                setRateLimitedNoCache(d.error || "Rate limited — no cached data. Check back in a few hours.");
                setRateLimited(false);
                setData(null);
                setLoading(false);
                return null;
              }
              return Promise.reject(new Error(d.error || `HTTP ${r.status}`));
            });
          }
          return r.json();
        })
        .then((d) => {
          if (d === null) return; // Already handled above
          // Rate limited with no cache — response came as 200 but has no vitals data
          if (d.rateLimited && !d.fromCache) {
            setRateLimitedNoCache(d.error || "Rate limited — no cached data. Check back in a few hours.");
            setRateLimited(false);
            setData(null);
            setLoading(false);
            return;
          }
          if (d.rateLimited && d.fromCache) {
            setRateLimited(true);
            setRateLimitedNoCache(null);
          } else {
            setRateLimited(false);
            setRateLimitedNoCache(null);
          }
          setData(d);
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
    },
    [domain]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-center justify-center gap-2 text-dark-muted">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm">
          Loading Core Web Vitals... (this may take up to 60s)
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">
            Core Web Vitals
          </h3>
          <button
            onClick={() => fetchData(true)}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors bg-dark-panel2 border border-dark-border rounded-lg"
            title="Retry"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-4 text-center text-sm text-dark-danger">
          Failed to load PageSpeed data: {error}
        </div>
      </div>
    );
  }

  if (rateLimitedNoCache) {
    return null;
  }

  if (!data) return null;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">
            Core Web Vitals
          </h3>
          <p className="text-xs text-dark-muted mt-0.5">
            Google PageSpeed Insights &mdash; Last checked{" "}
            {new Date(data.fetchedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading}
          className="p-1.5 text-dark-muted hover:text-dark-text transition-colors bg-dark-panel2 border border-dark-border rounded-lg disabled:opacity-50"
          title="Re-run PageSpeed test"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {rateLimited && data.fetchedAt && (
        <div className="mb-4 px-3 py-2 bg-dark-warn/10 border border-dark-warn/30 rounded-lg text-xs text-dark-warn flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cm-purple" />
          Cached data ({(() => {
            const hrs = Math.round((Date.now() - new Date(data.fetchedAt).getTime()) / 3600000);
            return hrs < 1 ? "<1h ago" : `${hrs}h ago`;
          })()}) — PageSpeed API rate limited
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {data.mobile && <MetricsPanel metrics={data.mobile} label="Mobile" icon={Smartphone} />}
        {data.desktop && <MetricsPanel metrics={data.desktop} label="Desktop" icon={Monitor} />}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-6 pt-4 border-t border-dark-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-dark-success" />
          <span className="text-[11px] text-dark-muted">Good</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cm-purple" />
          <span className="text-[11px] text-dark-muted">Needs improvement</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-dark-danger" />
          <span className="text-[11px] text-dark-muted">Poor</span>
        </div>
      </div>
    </div>
  );
}
