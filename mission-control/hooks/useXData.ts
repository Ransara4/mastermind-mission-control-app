"use client";

import { useState, useEffect, useCallback } from "react";
import type { XDashboard, FeedFilter } from "@/lib/x-types";

export function useXData() {
  const [data, setData] = useState<XDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (feedFilter !== "all") params.append("topic", feedFilter);

      const response = await fetch(`/api/x?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load X data");

      const result: XDashboard = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [feedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, feedFilter, setFeedFilter, refresh: fetchData };
}
