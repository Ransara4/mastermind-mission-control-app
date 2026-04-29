import { useState, useEffect, useCallback } from "react";

// --- Types ---

export interface ContentAnalytics {
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  engagementRate?: number;
  lastFetched?: string;
}

export interface ProjectContext {
  name: string;
  url?: string;
  mission: string;
  targetAudience: string;
  pillars: { name: string; themes: string[] }[];
  voice: {
    tone: string[];
    avoid: string[];
    engagingHooks: string[];
  };
  icp: {
    revenue: string;
    employees: string;
    industries: string[];
    painPoints: string[];
    buyingSignals: string[];
  };
}

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  contentType: "text" | "image" | "carousel" | "video" | "poll" | "document";
  status: "idea" | "draft" | "scheduled" | "published" | "archived";
  hook?: string;
  cta?: string;
  targetAudience?: string;
  notes?: string;
  pillar?: string;
  scheduledFor?: string;
  publishedAt?: string;
  linkedinPostId?: string;
  linkedinPostUrl?: string;
  analytics?: ContentAnalytics;
  carouselId?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface PipelineStats {
  idea: number;
  draft: number;
  scheduled: number;
  published: number;
  archived: number;
}

export interface LinkedInData {
  auth: { authenticated: boolean; valid: boolean; expiresAt?: number };
  project: ProjectContext | null;
  items: ContentItem[];
  archived: ContentItem[];
  carousels: any[];
  writers: Record<string, string>;
  hashtagSets: Record<string, string[]>;
  settings: {
    defaultHashtags: string[];
    postingDays: string[];
    postingTimes: string[];
    autoArchiveDays: number;
  };
  stats: {
    pipeline: PipelineStats;
    contentTypes: Record<string, number>;
    total: number;
    upcoming: ContentItem[];
    recentPublished: ContentItem[];
    analytics: {
      impressions: number;
      likes: number;
      comments: number;
      shares: number;
      clicks: number;
    };
  };
}

// --- Hook ---

export function useLinkedInData() {
  const [data, setData] = useState<LinkedInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/linkedin");
      if (!res.ok) throw new Error("Failed to fetch LinkedIn data");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- API helpers ---

  const apiPost = useCallback(
    async (body: Record<string, any>) => {
      const res = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await refresh();
      return json;
    },
    [refresh]
  );

  // --- Content CRUD ---

  const createContent = useCallback(
    (item: Partial<ContentItem>) => apiPost({ action: "create", ...item }),
    [apiPost]
  );

  const updateContent = useCallback(
    (id: string, updates: Partial<ContentItem>) =>
      apiPost({ action: "update", id, ...updates }),
    [apiPost]
  );

  const deleteContent = useCallback(
    (id: string) => apiPost({ action: "delete", id }),
    [apiPost]
  );

  // --- Pipeline ---

  const moveContent = useCallback(
    (id: string, status: ContentItem["status"], order?: number) =>
      apiPost({ action: "move", id, status, order }),
    [apiPost]
  );

  const reorderContent = useCallback(
    (items: { id: string; order: number }[]) =>
      apiPost({ action: "reorder", items }),
    [apiPost]
  );

  const bulkMove = useCallback(
    (ids: string[], status: ContentItem["status"]) =>
      apiPost({ action: "bulk-move", ids, status }),
    [apiPost]
  );

  // --- Import ---

  const importIdeas = useCallback(
    (text: string) => apiPost({ action: "import-ideas", text }),
    [apiPost]
  );

  const importIdeasArray = useCallback(
    (ideas: string[]) => apiPost({ action: "import-ideas", ideas }),
    [apiPost]
  );

  // --- Analytics ---

  const updateAnalytics = useCallback(
    (id: string, analytics: ContentAnalytics) =>
      apiPost({ action: "update-analytics", id, analytics }),
    [apiPost]
  );

  // --- Hashtag Sets ---

  const saveHashtagSet = useCallback(
    (name: string, hashtags: string[]) =>
      apiPost({ action: "save-hashtag-set", name, hashtags }),
    [apiPost]
  );

  const deleteHashtagSet = useCallback(
    (name: string) => apiPost({ action: "delete-hashtag-set", name }),
    [apiPost]
  );

  // --- Writer Files ---

  const saveWriter = useCallback(
    (file: string, content: string) =>
      apiPost({ action: "save-writer", file, content }),
    [apiPost]
  );

  // --- Settings ---

  const updateSettings = useCallback(
    (settings: Partial<LinkedInData["settings"]>) =>
      apiPost({ action: "update-settings", settings }),
    [apiPost]
  );

  return {
    data,
    loading,
    error,
    refresh,
    // Content
    createContent,
    updateContent,
    deleteContent,
    // Pipeline
    moveContent,
    reorderContent,
    bulkMove,
    // Import
    importIdeas,
    importIdeasArray,
    // Analytics
    updateAnalytics,
    // Hashtags
    saveHashtagSet,
    deleteHashtagSet,
    // Writers
    saveWriter,
    // Settings
    updateSettings,
  };
}
