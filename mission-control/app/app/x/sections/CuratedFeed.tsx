"use client";

import type { CuratedFeedData, TrackedTopic, FeedFilter, FeedItem } from "@/lib/x-types";
import { ExternalLink, Heart, Repeat2, MessageCircle, Eye, TrendingUp, Clock } from "lucide-react";

interface CuratedFeedProps {
  feed: CuratedFeedData;
  topics: TrackedTopic[];
  filter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-dark-danger/10 text-dark-danger border-dark-danger/30",
  medium: "bg-dark-warn/10 text-dark-warn border-dark-warn/30",
  low: "bg-dark-bg text-dark-muted border-dark-border",
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function CuratedFeed({ feed, topics, filter, onFilterChange }: CuratedFeedProps) {
  const enabledTopics = topics.filter(t => t.enabled);

  return (
    <div className="space-y-4">
      {/* Topic Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filter === "all"
              ? "bg-cm-purple text-white"
              : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
          }`}
        >
          All Topics
        </button>
        {enabledTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onFilterChange(topic.id as FeedFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === topic.id
                ? "bg-cm-purple text-white"
                : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
            }`}
          >
            {topic.name}
            {topic.itemCount !== undefined && topic.itemCount > 0 && (
              <span className={`text-xs px-1 rounded-full ${
                filter === topic.id ? "bg-cm-purple" : "bg-dark-panel2"
              }`}>
                {topic.itemCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Topic Summary Cards */}
      {filter === "all" && feed.topicBreakdown.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {feed.topicBreakdown.map((tb) => (
            <button
              key={tb.topicId}
              onClick={() => onFilterChange(tb.topicId as FeedFilter)}
              className="p-3 bg-dark-panel border border-dark-border rounded-lg hover:border-cm-purple transition-colors text-left"
            >
              <p className="text-xs text-dark-muted truncate">{tb.topicName}</p>
              <p className="text-2xl font-bold text-dark-text">{tb.count}</p>
            </button>
          ))}
        </div>
      )}

      {/* Feed Items */}
      {feed.items.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="mx-auto text-dark-muted mb-3" size={48} />
          <h3 className="text-lg font-medium  text-dark-muted mb-1">No feed items yet</h3>
          <p className="text-sm text-dark-muted">
            The curated feed will populate once X authentication is connected and topic tracking is active.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Last Updated */}
      {feed.lastUpdated && (
        <p className="text-xs text-dark-muted flex items-center gap-1">
          <Clock size={12} />
          Last updated: {new Date(feed.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-lg p-4 hover:border-dark-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Author & Topic */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold text-sm text-dark-text">
              {item.author.name}
            </span>
            <span className="text-xs text-dark-muted">
              @{item.author.handle}
            </span>
            {item.author.verified && (
              <span className="text-cm-purple text-xs">✓</span>
            )}
            <span className="text-xs text-dark-muted">·</span>
            <span className="text-xs text-dark-muted">
              {formatTimeAgo(item.postedAt)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              PRIORITY_COLORS[item.tags?.[0]] || "bg-dark-bg text-dark-muted border-dark-border"
            }`}>
              {item.topicName}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm text-dark-text leading-relaxed whitespace-pre-wrap">
            {item.content}
          </p>

          {/* Metrics */}
          <div className="flex items-center gap-4 mt-3 text-xs text-dark-muted">
            <span className="flex items-center gap-1">
              <Heart size={12} /> {formatNumber(item.metrics.likes)}
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 size={12} /> {formatNumber(item.metrics.retweets)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={12} /> {formatNumber(item.metrics.replies)}
            </span>
            {item.metrics.views !== undefined && (
              <span className="flex items-center gap-1">
                <Eye size={12} /> {formatNumber(item.metrics.views)}
              </span>
            )}
            {item.relevanceScore > 0 && (
              <span className="ml-auto text-xs text-cm-purple font-medium">
                {item.relevanceScore}% relevant
              </span>
            )}
          </div>
        </div>

        {/* External Link */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-2 text-dark-muted hover:text-cm-purple hover:bg-cm-purple/10 rounded-lg transition-colors"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
