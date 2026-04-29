"use client";

import { useState, useEffect, useCallback } from "react";

export interface CanvaAuth {
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasTokens: boolean;
  connected: boolean;
}

export interface CanvaDesign {
  id: string;
  title: string;
  owner?: { display_name?: string };
  thumbnail?: { url: string; width: number; height: number };
  urls?: { edit_url?: string; view_url?: string };
  created_at?: string;
  updated_at?: string;
}

export interface CanvaTemplate {
  id: string;
  title: string;
  thumbnail?: { url: string; width: number; height: number };
  created_at?: string;
  updated_at?: string;
}

export interface CanvaUser {
  display_name?: string;
  id?: string;
}

export interface CanvaData {
  auth: CanvaAuth;
  user: CanvaUser | null;
  designs: CanvaDesign[];
  templates: CanvaTemplate[];
  stats?: {
    totalDesigns: number;
    totalTemplates: number;
  };
  error: string | null;
}

export function useCanvaData() {
  const [data, setData] = useState<CanvaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/canva");
      if (!response.ok) throw new Error("Failed to load Canva data");
      const result: CanvaData = await response.json();
      setData(result);
    } catch (err) {
      console.error("Canva fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
