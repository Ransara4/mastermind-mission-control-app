"use client";

import {
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  MousePointerClick,
  BarChart3,
} from "lucide-react";
import { ContentItem } from "@/hooks/useLinkedInData";
import { formatNumber } from "./shared";

export function AnalyticsView({
  stats,
  items,
}: {
  stats: any;
  items: ContentItem[];
}) {
  const published = items.filter((i) => i.status === "published");
  const agg = stats?.analytics || {};

  return (
    <div className="space-y-6">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Impressions",
            value: agg.impressions,
            icon: Eye,
            color: "text-cm-purple bg-cm-purple/10",
          },
          {
            label: "Likes",
            value: agg.likes,
            icon: ThumbsUp,
            color: "text-dark-success bg-dark-success/10",
          },
          {
            label: "Comments",
            value: agg.comments,
            icon: MessageSquare,
            color: "text-purple-300 bg-purple-500/10",
          },
          {
            label: "Shares",
            value: agg.shares,
            icon: Share2,
            color: "text-orange-300 bg-orange-500/10",
          },
          {
            label: "Clicks",
            value: agg.clicks,
            icon: MousePointerClick,
            color: "text-pink-300 bg-pink-500/10",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-dark-panel rounded-xl border border-dark-border p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center ${stat.color}`}
                >
                  <Icon size={12} />
                </div>
                <span className="text-xs text-dark-muted">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-dark-text">
                {formatNumber(stat.value || 0)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Top performing posts */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h3 className="font-semibold  text-dark-text mb-4">
          Published Content ({published.length})
        </h3>
        {published.length === 0 ? (
          <div className="text-center py-8 text-dark-muted">
            <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
            <p>No published content yet</p>
            <p className="text-sm mt-1">
              Publish content to see analytics here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {published
              .sort(
                (a, b) =>
                  (b.analytics?.impressions || 0) -
                  (a.analytics?.impressions || 0)
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-bg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-text truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-dark-muted">
                      {item.contentType} &bull;{" "}
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  {item.analytics ? (
                    <div className="flex items-center gap-4 text-xs text-dark-muted flex-shrink-0 ml-4">
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {formatNumber(item.analytics.impressions || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={12} />
                        {item.analytics.likes || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {item.analytics.comments || 0}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-dark-muted ml-4">
                      No analytics yet
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Content type breakdown */}
      {stats?.contentTypes && Object.keys(stats.contentTypes).length > 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h3 className="font-semibold  text-dark-text mb-4">
            Content Mix
          </h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.contentTypes as Record<string, number>).map(
              ([type, count]) => (
                <div
                  key={type}
                  className="bg-dark-bg rounded-lg px-4 py-3 text-center"
                >
                  <p className="text-lg font-bold text-dark-text">{count}</p>
                  <p className="text-xs text-dark-muted capitalize">{type}</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
