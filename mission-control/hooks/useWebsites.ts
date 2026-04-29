"use client";

import { useState, useEffect, useCallback } from "react";

export interface Website {
  domain: string;
  name: string;
  status: string;
  hosting: string;
  base_url: string;
  registrar: string;
  entity: string;
  notes: string;
  added_at: string;
  updated_at: string;
  hosting_credentials: Record<string, string>;
  search_console: Record<string, string>;
  bing_webmaster: Record<string, string>;
  analytics: Record<string, string>;
  cdn: Record<string, string>;
  dns: Record<string, string>;
  tokens: Record<string, string>;
  tech_stack?: string;
  blog_enabled?: number;
  seo_enabled?: number;
  primary_contact_email?: string;
  favicon_url?: string;
  ssl_expiry?: string;
  domain_expiry?: string;
  monthly_visitors?: number;
  last_published?: string;
}

function parseJsonFields(raw: Record<string, unknown>): Website {
  const jsonFields = [
    "hosting_credentials", "search_console", "bing_webmaster",
    "analytics", "cdn", "dns", "tokens",
  ];
  const out = { ...raw } as Record<string, unknown>;
  for (const f of jsonFields) {
    if (typeof out[f] === "string") {
      try { out[f] = JSON.parse(out[f] as string); } catch { out[f] = {}; }
    } else if (!out[f]) {
      out[f] = {};
    }
  }
  return out as unknown as Website;
}

export function useWebsites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/websites");
      if (!res.ok) throw new Error("Failed to fetch websites");
      const data = await res.json();
      const parsed = (data.websites || []).map(parseJsonFields);
      setWebsites(parsed);
      setError(null);
    } catch (err) {
      console.error("fetchWebsites error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const getWebsite = useCallback(async (domain: string): Promise<Website | null> => {
    try {
      const res = await fetch(`/api/websites?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.website ? parseJsonFields(data.website) : null;
    } catch {
      return null;
    }
  }, []);

  const createWebsite = useCallback(async (website: Partial<Website> & { domain: string; name: string }) => {
    const res = await fetch("/api/websites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(website),
    });
    if (!res.ok) throw new Error("Failed to create website");
    await fetchWebsites();
    return res.json();
  }, [fetchWebsites]);

  const updateWebsite = useCallback(async (domain: string, updates: Partial<Website>) => {
    const res = await fetch("/api/websites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update website");
    await fetchWebsites();
    return res.json();
  }, [fetchWebsites]);

  const deleteWebsite = useCallback(async (domain: string) => {
    const res = await fetch("/api/websites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    if (!res.ok) throw new Error("Failed to delete website");
    await fetchWebsites();
    return res.json();
  }, [fetchWebsites]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  return {
    websites,
    loading,
    error,
    fetchWebsites,
    getWebsite,
    createWebsite,
    updateWebsite,
    deleteWebsite,
  };
}
