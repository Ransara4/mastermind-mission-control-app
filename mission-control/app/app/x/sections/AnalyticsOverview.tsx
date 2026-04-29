"use client";

import type { XAnalytics } from "@/lib/x-types";
import { BarChart3, Eye, Heart, Repeat2, Users, TrendingUp } from "lucide-react";

interface AnalyticsOverviewProps {
  analytics: XAnalytics;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function AnalyticsOverview({ analytics }: AnalyticsOverviewProps) {
  const { overview } = analytics;
  const hasData = overview.totalPosts > 0;

  if (!hasData) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="mx-auto text-dark-muted mb-3" size={48} />
        <h3 className="text-lg font-medium  text-dark-muted mb-1">No analytics yet</h3>
        <p className="text-sm text-dark-muted">
          Analytics will appear once posts are published and tracked.
        </p>
      </div>
    );
  }

  const stats = [
    { label: "Total Posts", value: formatNumber(overview.totalPosts), icon: <TrendingUp size={16} />, color: "text-cm-purple bg-cm-purple/10" },
    { label: "Impressions", value: formatNumber(overview.totalImpressions), icon: <Eye size={16} />, color: "text-purple-600 bg-purple-50" },
    { label: "Engagements", value: formatNumber(overview.totalEngagements), icon: <Heart size={16} />, color: "text-pink-600 bg-pink-50" },
    { label: "Engagement Rate", value: `${overview.engagementRate.toFixed(1)}%`, icon: <Repeat2 size={16} />, color: "text-dark-success bg-dark-success/10" },
    { label: "Followers Gained", value: `+${formatNumber(overview.followersGained)}`, icon: <Users size={16} />, color: "text-dark-warn bg-dark-warn/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-dark-panel border border-dark-border rounded-lg p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-dark-text">{stat.value}</p>
            <p className="text-xs text-dark-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Performance */}
      {analytics.recentPerformance.length > 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-dark-text mb-3">Recent Performance</h4>
          <div className="space-y-2">
            {analytics.recentPerformance.map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="text-dark-muted">{new Date(day.date).toLocaleDateString()}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-dark-muted">
                    {day.posts} post{day.posts !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-purple-600">
                    {formatNumber(day.impressions)} views
                  </span>
                  <span className="text-xs text-pink-600">
                    {formatNumber(day.engagements)} engagements
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Posts */}
      {analytics.topPosts.length > 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-dark-text mb-3">Top Performing Posts</h4>
          <div className="space-y-3">
            {analytics.topPosts.map((post) => (
              <div key={post.id} className="border-b border-dark-border pb-3 last:border-0 last:pb-0">
                <p className="text-sm text-dark-text line-clamp-2">{post.content}</p>
                {post.analytics && (
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-dark-muted">
                    <span>{formatNumber(post.analytics.impressions)} views</span>
                    <span>{formatNumber(post.analytics.likes)} likes</span>
                    <span>{formatNumber(post.analytics.retweets)} RTs</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
