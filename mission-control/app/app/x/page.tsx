"use client";

import { useState } from "react";
import { useXData } from "@/hooks/useXData";
import { RefreshCw, AlertTriangle, Loader2, Wifi, WifiOff } from "lucide-react";
import CuratedFeed from "./sections/CuratedFeed";
import PostComposer from "./sections/PostComposer";
import PostQueue from "./sections/PostQueue";
import TopicTracker from "./sections/TopicTracker";
import PostingRulesPanel from "./sections/PostingRulesPanel";
import AnalyticsOverview from "./sections/AnalyticsOverview";

type Tab = "feed" | "compose" | "queue" | "topics" | "rules" | "analytics";

export default function XPage() {
  const { data, loading, error, feedFilter, setFeedFilter, refresh } = useXData();
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-dark-muted" size={32} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="text-dark-warn" size={32} />
        <p className="text-dark-muted">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "feed", label: "Curated Feed", count: data.feed.items.length },
    { id: "compose", label: "Compose" },
    { id: "queue", label: "Queue", count: data.queue.drafts.length + data.queue.scheduled.length },
    { id: "topics", label: "Topics", count: data.topics.filter(t => t.enabled).length },
    { id: "rules", label: "Posting Rules" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold" style={{ fontFamily: "system-ui" }}>𝕏</span>
          <div>
            <h1 className="text-2xl font-extrabold  text-dark-text">X</h1>
            <p className="text-sm text-dark-muted">Private curated feed & content management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Auth Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            data.auth.connected
              ? "bg-dark-success/10 text-dark-success"
              : "bg-dark-panel2 text-dark-muted"
          }`}>
            {data.auth.connected ? (
              <>
                <Wifi size={12} />
                @{data.auth.username}
              </>
            ) : (
              <>
                <WifiOff size={12} />
                Not Connected
              </>
            )}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-dark-panel2 hover:bg-dark-panel2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-panel2 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-dark-panel text-dark-text shadow-sm"
                : "text-dark-muted hover:text-dark-text"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? "bg-cm-purple/20 text-cm-purple"
                  : "bg-dark-panel2 text-dark-muted"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "feed" && (
        <CuratedFeed
          feed={data.feed}
          topics={data.topics}
          filter={feedFilter}
          onFilterChange={setFeedFilter}
        />
      )}
      {activeTab === "compose" && (
        <PostComposer
          rules={data.postingRules}
          onSave={refresh}
        />
      )}
      {activeTab === "queue" && (
        <PostQueue queue={data.queue} onUpdate={refresh} />
      )}
      {activeTab === "topics" && (
        <TopicTracker topics={data.topics} />
      )}
      {activeTab === "rules" && (
        <PostingRulesPanel rules={data.postingRules} />
      )}
      {activeTab === "analytics" && (
        <AnalyticsOverview analytics={data.analytics} />
      )}
    </div>
  );
}
