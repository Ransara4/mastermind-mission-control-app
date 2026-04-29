"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScroogeDashboard, TimeRange } from "@/lib/scrooge-types";

export function useScroogeData() {
  const [data, setData] = useState<ScroogeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [modelFilter, setModelFilter] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (timeRange !== "all") params.append("timeRange", timeRange);
      if (modelFilter !== "all") params.append("model", modelFilter);

      const response = await fetch(
        `/api/scrooge/dashboard?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to load Scrooge data");

      const result: ScroogeDashboard = await response.json();
      setData(result);
    } catch (err) {
      console.error("Scrooge fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [timeRange, modelFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    timeRange,
    setTimeRange,
    modelFilter,
    setModelFilter,
    refresh: fetchData,
  };
}
