"use client";

import { useState, useEffect, useCallback } from "react";
import type { DescriptDashboard } from "@/lib/descript-types";

export function useDescriptData() {
  const [data, setData] = useState<DescriptDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/descript/dashboard");
      if (!response.ok) throw new Error("Failed to load Descript data");

      const result: DescriptDashboard = await response.json();
      setData(result);
    } catch (err) {
      console.error("Descript fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
