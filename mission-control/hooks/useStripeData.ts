"use client";

import { useState, useEffect, useCallback } from "react";
import type { StripeDashboard, TimeRange } from "@/lib/stripe-types";

export function useStripeData() {
  const [data, setData] = useState<StripeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (timeRange !== "all") params.append("timeRange", timeRange);

      const response = await fetch(
        `/api/stripe/dashboard?${params.toString()}`
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load Stripe data");
      }

      const result: StripeDashboard = await response.json();
      setData(result);
    } catch (err) {
      console.error("Stripe fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    timeRange,
    setTimeRange,
    refresh: fetchData,
  };
}
