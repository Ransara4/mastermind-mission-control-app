"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AutopilotResult,
  FixQueueItem,
  CrawlResult,
  RankResult,
  PageScan,
} from "@/lib/seo-types";

// Re-export types for convenience
export type { AutopilotResult, FixQueueItem, CrawlResult, RankResult, PageScan };

export interface SeoSiteEntry {
  domain: string;
  name: string;
  status: string;
  addedAt: string;
  hosting: string;
  agent: string;
  notes: string;
}

export interface SeoKeyword {
  keyword: string;
  rank: string;
  target: string;
  difficulty: string;
  volume: string;
  lastChecked: string;
}

export interface SeoAudit {
  name: string;
  date: string;
  title?: string;
  score?: number;
  grade?: string;
  critical?: number;
  warnings?: number;
  passes?: number;
  pages?: number;
}

export interface SeoContentDraft {
  name: string;
  title: string;
  date: string;
  size: number;
}

export interface SeoSiteData {
  domain: string;
  name: string;
  status: string;
  hosting: string;
  agent: string;
  profile: Record<string, string>;
  keywords: SeoKeyword[];
  audits: SeoAudit[];
  contentDrafts: SeoContentDraft[];
  outreachFiles: string[];
  autopilotResult: AutopilotResult | null;
  fixQueue: FixQueueItem[];
  crawlResult: CrawlResult | null;
  stats: {
    trackedKeywords: number;
    totalAudits: number;
    contentDrafts: number;
    outreachItems: number;
    lastAuditScore: number | null;
    lastRunAt: string | null;
  };
}

export interface SeoData {
  sites: SeoSiteEntry[];
  selectedSite: SeoSiteData | null;
  skillVersion: string;
  references: string[];
}

const STORAGE_KEY = "seo-selected-site";

export function useSeoData() {
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const fetchData = useCallback(async (domain: string | null) => {
    try {
      setLoading(true);
      setError(null);
      const url = domain ? `/api/seo?site=${encodeURIComponent(domain)}` : "/api/seo";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load SEO data");
      const result: SeoData = await response.json();
      setData(result);

      // Auto-select first site if none selected
      if (!domain && result.sites.length > 0) {
        const first = result.sites[0].domain;
        setSelectedDomain(first);
        localStorage.setItem(STORAGE_KEY, first);
        // Re-fetch with site selected
        const r2 = await fetch(`/api/seo?site=${encodeURIComponent(first)}`);
        if (r2.ok) setData(await r2.json());
      }
    } catch (err) {
      console.error("SEO fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDomain);
  }, [selectedDomain, fetchData]);

  const selectSite = useCallback((domain: string) => {
    setSelectedDomain(domain);
    localStorage.setItem(STORAGE_KEY, domain);
  }, []);

  const refresh = useCallback(() => {
    fetchData(selectedDomain);
  }, [fetchData, selectedDomain]);

  return { data, loading, error, selectedDomain, selectSite, refresh };
}
