"use client";

import { useState, useEffect, useCallback } from "react";
import type { GuardDogDashboard } from "@/lib/guard-dog-types";

export function useGuardDogData() {
  const [data, setData] = useState<GuardDogDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/guard-dog/dashboard");
      if (!response.ok) throw new Error("Failed to load Guard Dog data");

      const result: GuardDogDashboard = await response.json();
      setData(result);
    } catch (err) {
      console.error("Guard Dog fetch error:", err);
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
