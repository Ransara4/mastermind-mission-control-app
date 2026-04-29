"use client";

import { useState, useEffect, useCallback } from "react";

export interface BlogServiceClient {
  id: string;
  name: string;
  tier?: "Starter" | "Growth" | "Agency";
  status?: "active" | "paused" | "inactive";
  platform?: string;
  monthlyFee?: number;
  postsPerWeek?: number;
  postsToday?: number;
  lastPost?: string | null;
  nextRun?: string | null;
  createdAt?: string;
  contentScoreAvg?: number;
}

export interface BlogServicePost {
  id: string;
  clientId?: string;
  clientName?: string;
  title?: string;
  platform?: string;
  status?: "published" | "draft" | "failed";
  publishedAt?: string;
  url?: string;
  seoScore?: number;
}

export interface ContentQuality {
  overallAvgScore: number;
  thisWeekAvgScore: number;
  lastWeekAvgScore: number;
  postsAbove70ThisWeek: number;
  scoreImproving: boolean;
}

export interface WeeklyChartDay {
  day: string;
  count: number;
}

export interface RevenueBreakdown {
  starter: number;
  growth: number;
  agency: number;
}

export interface BlogServiceDashboard {
  status: "idle" | "running" | "error";
  activeClients: number;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
  totalPosts: number;
  mrr: number;
  clients: BlogServiceClient[];
  recentPosts: BlogServicePost[];
  nextScheduledRuns: { clientId: string; clientName: string; nextRun: string }[];
  lastRun: string | null;
  nextRunIn: number;
  weeklyPostsChart: WeeklyChartDay[];
  contentQuality: ContentQuality;
  revenueBreakdown: RevenueBreakdown;
}

export function useBlogServiceData() {
  const [data, setData] = useState<BlogServiceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/blog-service");
      if (!res.ok) throw new Error("Failed to load PostPilot data");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runNow = useCallback(async (): Promise<void> => {
    await fetch("/api/blog-service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run-now" }),
    });
    await fetchData();
  }, [fetchData]);

  const toggleClient = useCallback(
    async (clientId: string, currentStatus: string) => {
      const action = currentStatus === "paused" ? "resume-client" : "pause-client";
      await fetch("/api/blog-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clientId }),
      });
      await fetchData();
    },
    [fetchData]
  );

  return { data, loading, error, refresh: fetchData, runNow, toggleClient };
}
