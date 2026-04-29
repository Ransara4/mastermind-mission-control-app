"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Trash2,
  FolderOpen,
} from "lucide-react";

interface DailyStat {
  date: string;
  count: number;
}

interface PlatformStat {
  platform: string;
  count: number;
}

interface MetricsData {
  dailyStats: DailyStat[];
  platformStats: PlatformStat[];
  totalEmails: number;
}

export default function MetricsSection() {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);

  useEffect(() => {
    fetch("/api/emmie/metrics")
      .then((r) => r.json())
      .then((data) => {
        setMetricsData({
          dailyStats: data.dailyStats || [],
          platformStats: data.platformStats || [],
          totalEmails: data.totalEmails || 0,
        });
      })
      .catch(() =>
        setMetricsData({ dailyStats: [], platformStats: [], totalEmails: 0 })
      );
  }, []);

  const stats = useMemo(() => {
    if (!metricsData || metricsData.dailyStats.length === 0) {
      return { totalProcessed: 0, trend: 0, last7Total: 0, prev7Total: 0 };
    }

    const { dailyStats } = metricsData;
    const totalProcessed = metricsData.totalEmails;

    // Calculate 7-day trend
    const last7 = dailyStats.slice(0, 7);
    const prev7 = dailyStats.slice(7, 14);

    const last7Total = last7.reduce((sum, d) => sum + d.count, 0);
    const prev7Total = prev7.reduce((sum, d) => sum + d.count, 0);

    const trend =
      prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;

    return { totalProcessed, trend, last7Total, prev7Total };
  }, [metricsData]);

  if (metricsData === null) {
    return <div>Loading...</div>;
  }

  const { dailyStats, platformStats, totalEmails } = metricsData;
  const maxCount = dailyStats.length > 0 ? Math.max(...dailyStats.map((d) => d.count)) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold  text-dark-text mb-2">
          Metrics Dashboard
        </h1>
        <p className="text-dark-muted">
          Track Emmie's performance over the last 30 days
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-dark-danger/15 text-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-cm-pink-light text-sm">Total Emails Processed</p>
            <Trash2 size={20} className="text-cm-pink-light" />
          </div>
          <p className="text-3xl font-bold">{totalEmails}</p>
          <p className="text-xs text-cm-pink-light mt-1">All time</p>
        </div>

        <div className="bg-cm-purple/20 text-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-cm-purple-mid text-sm">Top Platform</p>
            <FolderOpen size={20} className="text-cm-purple-mid" />
          </div>
          <p className="text-3xl font-bold">
            {platformStats[0]?.platform || "—"}
          </p>
          <p className="text-xs text-cm-purple-mid mt-1">
            {platformStats[0]
              ? `${platformStats[0].count} emails`
              : "No data yet"}
          </p>
        </div>

        <div className="bg-gradient-to-br from-cm-purple to-cm-purple/60 text-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-dark-muted text-sm">Last 7 Days</p>
            <BarChart3 size={20} className="text-dark-muted" />
          </div>
          <p className="text-3xl font-bold">{stats.last7Total}</p>
          <p className="text-xs text-dark-muted mt-1">Emails processed</p>
        </div>
      </div>

      {/* Trend Card */}
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="font-bold  text-dark-text mb-4">7-Day Trend</h3>
        <div className="flex items-center gap-4">
          <div
            className={`p-4 rounded-full ${
              stats.trend > 0
                ? "bg-dark-success/20"
                : stats.trend < 0
                ? "bg-dark-danger/20"
                : "bg-dark-panel2"
            }`}
          >
            {stats.trend >= 0 ? (
              <TrendingUp
                size={32}
                className={stats.trend > 0 ? "text-dark-success" : "text-dark-muted"}
              />
            ) : (
              <TrendingDown size={32} className="text-dark-danger" />
            )}
          </div>
          <div>
            <p
              className={`text-3xl font-bold ${
                stats.trend > 0
                  ? "text-dark-success"
                  : stats.trend < 0
                  ? "text-dark-danger"
                  : "text-dark-text"
              }`}
            >
              {stats.trend > 0 ? "+" : ""}
              {stats.trend.toFixed(1)}%
            </p>
            <p className="text-sm text-dark-muted">
              vs previous week · {stats.totalProcessed} total emails tracked
            </p>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Chart */}
      {dailyStats.length > 0 && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
          <h3 className="font-bold  text-dark-text mb-4">
            Daily Activity (Last 30 Days)
          </h3>
          <div className="space-y-2">
            {dailyStats.slice(0, 10).map((d, idx) => {
              const percentage = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-dark-muted">
                      {new Date(d.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-dark-text font-medium">{d.count}</span>
                  </div>
                  <div className="w-full bg-dark-panel2 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cm-purple to-cm-pink rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      {platformStats.length > 0 && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
          <h3 className="font-bold  text-dark-text mb-4">
            Top Platforms / Senders
          </h3>
          <div className="space-y-3">
            {platformStats.slice(0, 10).map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"
              >
                <span className="text-sm font-medium text-dark-text">
                  {p.platform}
                </span>
                <span className="text-xs text-dark-muted">
                  {p.count} email{p.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dailyStats.length === 0 && platformStats.length === 0 && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-8 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-dark-muted" />
          <p className="text-dark-muted">No metrics data available yet</p>
        </div>
      )}
    </div>
  );
}
