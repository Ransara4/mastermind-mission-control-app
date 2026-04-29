"use client";

import { useState, useEffect, useCallback } from "react";

export interface YouTubeStats {
  trackedChannels: number;
  totalRecentVideos: number;
  totalRecentViews: number;
  avgViewsPerVideo: number;
}

export interface YouTubeVideo {
  videoId?: string;
  video_id?: string;
  title?: string;
  views: number;
  viewCount?: string;
  view_count?: string;
  published?: string;
  publishedAt?: string;
  channelHandle: string;
  channelLabel: string;
  thumbnail?: string;
  duration?: string;
}

export interface YouTubeChannel {
  handle: string;
  label: string;
  videos?: YouTubeVideo[];
  results?: YouTubeVideo[];
  error?: string;
  channel_info?: { title?: string; description?: string; subscriber_count?: string };
}

export interface YouTubeDashboard {
  channels: YouTubeChannel[];
  stats: YouTubeStats;
  recentVideos: YouTubeVideo[];
  message?: string;
}

export function useYoutubeData() {
  const [data, setData] = useState<YouTubeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/youtube?action=dashboard");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load YouTube data");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const addChannel = useCallback(async (handle: string, label?: string) => {
    const res = await fetch("/api/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", handle, label }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to add channel");
    return body;
  }, []);

  const removeChannel = useCallback(async (handle: string) => {
    const res = await fetch("/api/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", handle }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to remove channel");
    return body;
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData, addChannel, removeChannel };
}
