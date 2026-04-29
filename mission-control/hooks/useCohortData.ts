"use client";

import { useState, useEffect, useCallback } from "react";

export interface BlogPost {
  id: number;
  wix_post_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content_markdown: string | null;
  content_ricos: string | null;
  category_ids: string;
  tag_ids: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  cta_type: string;
  internal_links: string;
  quality_score: number | null;
  quality_notes: string | null;
  status: string;
  rejection_reason: string | null;
  generated_at: string | null;
  approved_at: string | null;
  queued_at: string | null;
  published_at: string | null;
  topic_source: string | null;
  content_pillar: string | null;
  word_count: number | null;
  target_segment: string | null;
  validation_status: string | null;
  validation_notes: string | null;
  cover_image_url: string | null;
  image_keywords: string | null;
}

export interface BlogStats {
  pending: number;
  queued: number;
  publishedToday: number;
  publishedWeek: number;
  publishedTotal: number;
  avgQuality: number | null;
  rejected: number;
}

export interface BlogSettings {
  [key: string]: string;
}

export interface BlogFilters {
  status?: string;
  pillar?: string;
  minScore?: number;
  search?: string;
  limit?: number;
  offset?: number;
  site_domain?: string;
}

export function useCohortData(siteDomain?: string) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [settings, setSettings] = useState<BlogSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (filters: BlogFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (siteDomain) params.set("site_domain", siteDomain);
      if (filters.site_domain) params.set("site_domain", filters.site_domain);
      if (filters.status) params.set("status", filters.status);
      if (filters.pillar) params.set("pillar", filters.pillar);
      if (filters.minScore) params.set("minScore", String(filters.minScore));
      if (filters.search) params.set("search", filters.search);
      if (filters.limit) params.set("limit", String(filters.limit));
      if (filters.offset) params.set("offset", String(filters.offset));
      const qs = params.toString();
      const res = await fetch(`/api/cohorts/blog${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("fetchPosts error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [siteDomain]);

  const fetchStats = useCallback(async (domain?: string) => {
    try {
      const params = new URLSearchParams();
      const effectiveDomain = domain || siteDomain;
      if (effectiveDomain) params.set("site_domain", effectiveDomain);
      const qs = params.toString();
      const res = await fetch(`/api/cohorts/stats${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data.stats || null);
    } catch (err) {
      console.error("fetchStats error:", err);
    }
  }, [siteDomain]);

  const fetchSettings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (siteDomain) params.set("site_domain", siteDomain);
      const qs = params.toString();
      const res = await fetch(`/api/cohorts/settings${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (err) {
      console.error("fetchSettings error:", err);
    }
  }, [siteDomain]);


  const rejectPost = useCallback(async (id: number, reason: string) => {
    const res = await fetch("/api/cohorts/blog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "rejected", rejection_reason: reason }),
    });
    if (!res.ok) throw new Error("Failed to reject post");
    return res.json();
  }, []);

  const queuePost = useCallback(async (id: number) => {
    const res = await fetch("/api/cohorts/blog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "queued" }),
    });
    if (!res.ok) throw new Error("Failed to queue post");
    return res.json();
  }, []);

  const publishPost = useCallback(async (id: number) => {
    const res = await fetch("/api/cohorts/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Failed to publish post");
    return res.json();
  }, []);


  const updateSettings = useCallback(async (updates: Record<string, string>) => {
    const res = await fetch("/api/cohorts/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates, site_domain: siteDomain }),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    await fetchSettings();
    return res.json();
  }, [fetchSettings, siteDomain]);

  const triggerGeneration = useCallback(async () => {
    const res = await fetch("/api/cohorts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to trigger generation");
    return res.json();
  }, []);

  const deletePost = useCallback(async (id: number) => {
    const res = await fetch("/api/cohorts/blog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Failed to delete post");
    return res.json();
  }, []);

  const restorePost = useCallback(async (id: number) => {
    const res = await fetch("/api/cohorts/blog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "needs_review", rejection_reason: null }),
    });
    if (!res.ok) throw new Error("Failed to restore post");
    return res.json();
  }, []);

  // Initial load — skip fetchPosts so the page controls the initial filter
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchSettings()]).finally(() =>
      setLoading(false)
    );
  }, [fetchStats, fetchSettings]);

  const refresh = useCallback(async (filters?: BlogFilters) => {
    setLoading(true);
    await Promise.all([fetchPosts(filters), fetchStats(), fetchSettings()]);
    setLoading(false);
  }, [fetchPosts, fetchStats, fetchSettings]);

  return {
    posts,
    total,
    stats,
    settings,
    loading,
    error,
    fetchPosts,
    fetchStats,
    fetchSettings,
    rejectPost,
    queuePost,
    publishPost,
    updateSettings,
    triggerGeneration,
    deletePost,
    restorePost,
    refresh,
  };
}
