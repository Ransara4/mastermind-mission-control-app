"use client";

import { useState, useEffect, useCallback } from "react";
import type { WhoopDashboard } from "@/lib/whoop-types";

export function useWhoopData() {
  const [data, setData] = useState<WhoopDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/whoop/dashboard");
      if (!response.ok) throw new Error("Failed to load WHOOP data");
      const result: WhoopDashboard = await response.json();
      setData(result);
    } catch (err) {
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
