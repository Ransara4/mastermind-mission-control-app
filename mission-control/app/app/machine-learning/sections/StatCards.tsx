"use client";

import { Dna, TrendingUp, History, BookOpen, Activity } from "lucide-react";
import type { MLDashboard, EvolutionEvent } from "@/lib/ml-types";

function deriveTrends(events: EvolutionEvent[], ml?: MLDashboard["ml"]) {
  const sorted = [...events].sort((a, b) => {
    const tA = a.meta?.at ? new Date(a.meta.at as string).getTime() : 0;
    const tB = b.meta?.at ? new Date(b.meta.at as string).getTime() : 0;
    return tB - tA;
  });
  const half = Math.ceil(sorted.length / 2);
  const recent = sorted.slice(0, half);
  const older = sorted.slice(half);

  const rate = (evts: EvolutionEvent[]) =>
    evts.length === 0 ? 0 : evts.filter((e) => e.outcome?.status === "success").length / evts.length;

  const recentRate = rate(recent);
  const olderRate = rate(older);
  const rateDiff = recentRate - olderRate;

  const successTrend: string =
    events.length < 4 ? "stable" : rateDiff > 0.05 ? "▲" : rateDiff < -0.05 ? "▼" : "stable";

  // Cycle frequency: compare time gaps
  let cycleTrend = "stable";
  if (sorted.length >= 4) {
    const getGap = (evts: EvolutionEvent[]) => {
      const times = evts
        .map((e) => (e.meta?.at ? new Date(e.meta.at as string).getTime() : 0))
        .filter((t) => t > 0);
      if (times.length < 2) return Infinity;
      return (times[0] - times[times.length - 1]) / (times.length - 1);
    };
    const recentGap = getGap(recent);
    const olderGap = getGap(older);
    if (olderGap > 0 && recentGap < olderGap * 0.8) cycleTrend = "▲";
    else if (olderGap > 0 && recentGap > olderGap * 1.2) cycleTrend = "▼";
  }

  const knowledgeTrend = ml?.knowledge?.improvement_trend === "improving" ? "▲"
    : ml?.knowledge?.improvement_trend === "declining" ? "▼" : "stable";

  const feedbackTrend = (ml?.feedback?.success_rate ?? 0) > 0.7 ? "▲"
    : (ml?.feedback?.success_rate ?? 0) < 0.3 && (ml?.feedback?.total ?? 0) > 0 ? "▼" : "stable";

  return { successTrend, cycleTrend, knowledgeTrend, feedbackTrend };
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function StatCards({
  stats,
  eventCount,
  ml,
  events,
  lastUpdated,
}: {
  stats: MLDashboard["stats"];
  eventCount?: number;
  ml?: MLDashboard["ml"];
  events?: EvolutionEvent[];
  lastUpdated?: string;
}) {
  const trends = deriveTrends(events || [], ml);

  const cards = [
    {
      label: "Genes",
      value: stats.geneCount,
      subtitle: "Evolution strategies",
      icon: Dna,
      trend: null as string | null,
    },
    {
      label: "Success Rate",
      value: `${stats.successRate.toFixed(0)}%`,
      subtitle: `${stats.capsuleCount + stats.failedCapsuleCount} total attempts`,
      icon: TrendingUp,
      trend: trends.successTrend,
    },
    {
      label: "Cycles",
      value: eventCount || 0,
      subtitle: "Evolution events",
      icon: History,
      trend: trends.cycleTrend,
    },
    {
      label: "Lessons",
      value: ml?.knowledge?.total_lessons || 0,
      subtitle: `${(ml?.knowledge?.avg_confidence ?? 0) > 0 ? `${((ml?.knowledge?.avg_confidence ?? 0) * 100).toFixed(0)}% avg confidence` : "Building..."}`,
      icon: BookOpen,
      trend: trends.knowledgeTrend,
    },
    {
      label: "Fixes Tracked",
      value: ml?.feedback?.total || 0,
      subtitle: `${ml?.feedback?.proven || 0} proven`,
      icon: Activity,
      trend: trends.feedbackTrend,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-dark-panel border border-dark-border rounded-lg p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-dark-muted text-sm">{card.label}</p>
                <Icon size={20} className="text-dark-muted" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-dark-text">{card.value}</p>
                {card.trend && card.trend !== "stable" && (
                  <span className="text-sm text-dark-muted">{card.trend}</span>
                )}
                {card.trend === "stable" && (
                  <span className="text-xs text-dark-muted">stable</span>
                )}
              </div>
              <p className="text-xs text-dark-muted mt-1">{card.subtitle}</p>
            </div>
          );
        })}
      </div>
      {lastUpdated && (
        <p className="text-xs text-dark-muted mt-2 text-right">
          As of {formatTimeAgo(lastUpdated)}
        </p>
      )}
    </div>
  );
}
