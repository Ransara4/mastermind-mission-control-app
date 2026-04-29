"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, ExternalLink, BarChart2 } from "lucide-react";
import type { BingStats } from "@/lib/seo-types";

interface BingStatsPanelProps {
  domain: string;
}

interface BingApiResponse {
  configured?: boolean;
  stats?: BingStats;
  error?: string;
}

interface QuotaResponse {
  configured?: boolean;
  quota?: { crawlRequestsLeft: number; urlsSubmittedToday: number; reIndexNowRequestsLeft: number } | null;
  error?: string;
}

export default function BingStatsPanel({ domain }: BingStatsPanelProps) {
  const [statsData, setStatsData] = useState<BingApiResponse | null>(null);
  const [quotaData, setQuotaData] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) return;
    load();
  }, [domain]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, quotaRes] = await Promise.all([
        fetch(`/api/seo/bing?action=stats&domain=${encodeURIComponent(domain)}`),
        fetch(`/api/seo/bing?action=quota&domain=${encodeURIComponent(domain)}`),
      ]);
      const stats = await statsRes.json();
      const quota = await quotaRes.json();
      setStatsData(stats);
      setQuotaData(quota);
    } catch (e: any) {
      setError(e.message || "Failed to load Bing data");
    } finally {
      setLoading(false);
    }
  }

  const notConfigured = statsData?.configured === false || quotaData?.configured === false;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-dark-text">Bing Webmaster Tools</h3>

      {loading && (
        <div className="flex items-center gap-2 text-dark-muted text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          Loading Bing data...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-dark-danger text-sm py-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!loading && !error && notConfigured && (
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4 text-sm text-dark-muted space-y-2">
          <p className="text-dark-text font-medium">Bing API Key not configured</p>
          <p>Add your Bing Webmaster API key to connect this domain.</p>
          <a
            href="/app/settings"
            className="inline-flex items-center gap-1.5 text-cm-purple hover:text-cm-purple/80 transition-colors text-sm font-medium"
          >
            Configure in Settings
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {!loading && !error && !notConfigured && statsData?.stats && (
        <div className="space-y-4">
          {/* Summary stats */}
          {(() => {
            const s = statsData.stats!;
            const totalClicks = s.dailyStats?.reduce((sum, d) => sum + d.clicks, 0) ?? 0;
            const totalImpressions = s.dailyStats?.reduce((sum, d) => sum + d.impressions, 0) ?? 0;
            const topQuery = s.queryStats?.[0];
            const avgPos = topQuery?.avgClickPosition ?? null;

            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-dark-text">{totalClicks.toLocaleString()}</p>
                  <p className="text-xs text-dark-muted mt-0.5">Total Clicks</p>
                </div>
                <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-dark-text">{totalImpressions.toLocaleString()}</p>
                  <p className="text-xs text-dark-muted mt-0.5">Impressions</p>
                </div>
                <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-dark-text">{avgPos !== null ? avgPos.toFixed(1) : "—"}</p>
                  <p className="text-xs text-dark-muted mt-0.5">Avg Position</p>
                </div>
              </div>
            );
          })()}

          {/* Top queries */}
          {statsData.stats!.queryStats && statsData.stats!.queryStats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-2">Top Queries</p>
              <div className="space-y-1">
                {statsData.stats!.queryStats.slice(0, 5).map((q, i) => (
                  <div key={i} className="flex items-center justify-between bg-dark-panel2 border border-dark-border rounded px-3 py-1.5">
                    <span className="text-sm text-dark-text truncate max-w-[60%]">{q.query}</span>
                    <div className="flex items-center gap-3 text-xs text-dark-muted">
                      <span>{q.clicks} clicks</span>
                      <span>pos {q.avgClickPosition.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crawl quota */}
          {quotaData?.quota && (
            <div>
              <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-2">Crawl Quota</p>
              <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-muted">Crawl requests remaining</span>
                  <span className="text-dark-text font-medium">{quotaData.quota.crawlRequestsLeft ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-muted">URLs submitted today</span>
                  <span className="text-dark-text font-medium">{quotaData.quota.urlsSubmittedToday ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-muted">Re-index requests left</span>
                  <span className="text-dark-text font-medium">{quotaData.quota.reIndexNowRequestsLeft ?? "—"}</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-dark-muted">
            Data fetched: {new Date(statsData.stats!.fetchedAt).toLocaleString()}
          </p>
        </div>
      )}

      {!loading && !error && !notConfigured && !statsData?.stats && statsData && (
        <div className="flex items-center gap-2 text-dark-muted text-sm py-2">
          <BarChart2 size={15} />
          No Bing data available for this domain yet.
        </div>
      )}
    </div>
  );
}
