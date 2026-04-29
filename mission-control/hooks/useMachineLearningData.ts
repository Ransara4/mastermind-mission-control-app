"use client";

import { useState, useEffect, useCallback } from "react";
import type { MLDashboard } from "@/lib/ml-types";
import { useMCRefreshInterval } from "@/hooks/useMCRefreshInterval";

export function useMachineLearningData() {
  const refreshMs = useMCRefreshInterval();
  const [data, setData] = useState<MLDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/machine-learning/dashboard");
      if (!response.ok) throw new Error("Failed to load ML data");
      const result: MLDashboard = await response.json();
      setData(result);
    } catch (err) {
      console.error("ML dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshMs]);

  const updateSetting = useCallback(
    async (key: string, value: string) => {
      try {
        const response = await fetch("/api/machine-learning/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to update setting");
        }
        await fetchData();
      } catch (err) {
        console.error("Settings update error:", err);
        throw err;
      }
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    updateSetting,
  };
}
